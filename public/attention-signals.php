<?php
/**
 * Glovety Observatory attention-signals API
 *
 * Place this file at:
 *   public_html/api/attention-signals.php
 *
 * Expected frontend endpoint:
 *   /api/attention-signals.php?company=Apple
 *
 * This API:
 * - Reads companies_002.csv as the single company master
 * - Validates the requested company against the CSV
 * - Fetches NewsAPI articles when NEWS_API_KEY is set
 * - Fetches X recent posts when X_BEARER_TOKEN is set
 * - Optionally uses OpenAI to convert raw items into topic signals
 * - Falls back safely to heuristic topic labels when APIs/LLM are unavailable
 * - Returns { company, updatedAt, snsItems, newsItems }
 */

// ------------------------------------------------------
// Basic response / CORS
// ------------------------------------------------------
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

// ------------------------------------------------------
// Config
// ------------------------------------------------------
$config = loadConfig(__DIR__ . '/api-config.php');

$NEWS_API_KEY = getConfigValue($config, 'NEWS_API_KEY');
$X_BEARER_TOKEN = getConfigValue($config, 'X_BEARER_TOKEN');
$OPENAI_API_KEY = getConfigValue($config, 'OPENAI_API_KEY');

$ENABLE_OPENAI_TOPICING = asBool(getConfigValue($config, 'ENABLE_OPENAI_TOPICING', 'false'));
$OPENAI_MODEL = getConfigValue($config, 'OPENAI_MODEL', 'gpt-4.1-mini');

$CACHE_TTL_SECONDS = intval(getConfigValue($config, 'CACHE_TTL_SECONDS', '300'));
$NEWS_PAGE_SIZE = intval(getConfigValue($config, 'NEWS_PAGE_SIZE', '8'));
$X_MAX_RESULTS = intval(getConfigValue($config, 'X_MAX_RESULTS', '10'));
$DEBUG = isset($_GET['debug']) && $_GET['debug'] === '1';

$NEWS_PAGE_SIZE = max(1, min($NEWS_PAGE_SIZE, 20));
$X_MAX_RESULTS = max(10, min($X_MAX_RESULTS, 100)); // X recent search requires 10-100 in many plans.

// ------------------------------------------------------
// Request
// ------------------------------------------------------
$companyParam = isset($_GET['company']) ? trim((string) $_GET['company']) : '';

if ($companyParam === '') {
  jsonResponse(['error' => 'company is required'], 400);
}

$csvPath = findCompaniesCsvPath();
if (!$csvPath) {
  jsonResponse([
    'error' => 'companies_002.csv not found',
    'hint' => 'Place companies_002.csv at public_html/companies_002.csv or public_html/assets/companies_002.csv'
  ], 500);
}

$companies = loadCompaniesFromCsv($csvPath);
$companyConfig = findCompanyConfig($companies, $companyParam);

if (!$companyConfig) {
  jsonResponse([
    'error' => 'company not found in companies_002.csv',
    'company' => $companyParam
  ], 404);
}

$companyName = $companyConfig['name'];

// ------------------------------------------------------
// Cache
// ------------------------------------------------------
$cacheKey = sha1(strtolower($companyName) . '|' . ($ENABLE_OPENAI_TOPICING ? 'llm' : 'heuristic'));
$cacheDir = __DIR__ . '/cache/attention-signals';
$cachePath = $cacheDir . '/' . $cacheKey . '.json';

if ($CACHE_TTL_SECONDS > 0 && file_exists($cachePath)) {
  $age = time() - filemtime($cachePath);
  if ($age >= 0 && $age < $CACHE_TTL_SECONDS) {
    $cached = file_get_contents($cachePath);
    if ($cached !== false) {
      header('X-Glovety-Cache: HIT');
      echo $cached;
      exit;
    }
  }
}

// ------------------------------------------------------
// Fetch raw data
// ------------------------------------------------------
$meta = [
  'csvPath' => $csvPath,
  'company' => $companyName,
  'searchTerms' => $companyConfig['searchTerms'],
  'excludeTerms' => $companyConfig['excludeTerms'],
  'newsApiEnabled' => $NEWS_API_KEY !== '',
  'xApiEnabled' => $X_BEARER_TOKEN !== '',
  'openAiTopicingEnabled' => $ENABLE_OPENAI_TOPICING && $OPENAI_API_KEY !== ''
];

$rawNews = [];
$rawSns = [];
$warnings = [];

if ($NEWS_API_KEY !== '') {
  try {
    $rawNews = fetchNewsApiItems($companyConfig, $NEWS_API_KEY, $NEWS_PAGE_SIZE);
  } catch (Throwable $e) {
    $warnings[] = 'NewsAPI failed: ' . $e->getMessage();
  }
}

if ($X_BEARER_TOKEN !== '') {
  try {
    $rawSns = fetchXRecentPosts($companyConfig, $X_BEARER_TOKEN, $X_MAX_RESULTS);
  } catch (Throwable $e) {
    $warnings[] = 'X API failed: ' . $e->getMessage();
  }
}

// ------------------------------------------------------
// Convert raw items into signal items
// ------------------------------------------------------
$newsItems = [];
$snsItems = [];

foreach ($rawNews as $item) {
  $newsItems[] = buildNewsSignalItem($item, $companyName, $ENABLE_OPENAI_TOPICING, $OPENAI_API_KEY, $OPENAI_MODEL);
}

foreach ($rawSns as $item) {
  $snsItems[] = buildSnsSignalItem($item, $companyName, $ENABLE_OPENAI_TOPICING, $OPENAI_API_KEY, $OPENAI_MODEL);
}

$response = [
  'company' => $companyName,
  'updatedAt' => date('c'),
  'snsItems' => $snsItems,
  'newsItems' => $newsItems,
  'meta' => [
    'source' => 'api',
    'newsCount' => count($newsItems),
    'snsCount' => count($snsItems),
    'warnings' => $warnings
  ]
];

if ($DEBUG) {
  $response['debug'] = $meta;
}

// Keep production payload lean unless debug=1.
if (!$DEBUG && empty($warnings)) {
  unset($response['meta']['warnings']);
}

$json = json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

if ($json === false) {
  jsonResponse(['error' => 'failed to encode response'], 500);
}

if ($CACHE_TTL_SECONDS > 0) {
  if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0755, true);
  }
  @file_put_contents($cachePath, $json);
}

header('X-Glovety-Cache: MISS');
echo $json;
exit;

// ======================================================
// Config helpers
// ======================================================

function loadConfig($path) {
  if (file_exists($path)) {
    $config = include $path;
    if (is_array($config)) return $config;
  }
  return [];
}

function getConfigValue($config, $key, $default = '') {
  if (isset($config[$key]) && $config[$key] !== '') return (string) $config[$key];
  $value = getenv($key);
  if ($value !== false && $value !== '') return (string) $value;
  return $default;
}

function asBool($value) {
  $value = strtolower(trim((string) $value));
  return in_array($value, ['1', 'true', 'yes', 'on'], true);
}

function jsonResponse($data, $status = 200) {
  http_response_code($status);
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

// ======================================================
// CSV company master
// ======================================================

function findCompaniesCsvPath() {
  $candidates = [
    __DIR__ . '/../companies_002.csv',
    __DIR__ . '/../assets/companies_002.csv',
    __DIR__ . '/../../companies_002.csv',
    __DIR__ . '/companies_002.csv'
  ];

  foreach ($candidates as $path) {
    if (file_exists($path)) return $path;
  }
  return null;
}

function loadCompaniesFromCsv($csvPath) {
  $companies = [];
  $handle = fopen($csvPath, 'r');
  if (!$handle) return $companies;

  $header = fgetcsv($handle);
  if (!$header) {
    fclose($handle);
    return $companies;
  }

  $header = array_map(function ($value) {
    return strtolower(trim(removeBom((string) $value)));
  }, $header);

  $nameIndex = findHeaderIndex($header, ['name', 'company', 'companyname', 'company_name']);
  if ($nameIndex === -1) $nameIndex = 0;

  $tickerIndex = findHeaderIndex($header, ['ticker', 'symbol']);
  $aliasesIndex = findHeaderIndex($header, ['aliases', 'alias', 'search_terms', 'searchterms']);
  $excludeIndex = findHeaderIndex($header, ['exclude_terms', 'exclude', 'excludes']);

  while (($row = fgetcsv($handle)) !== false) {
    if (count($row) === 0) continue;

    $name = isset($row[$nameIndex]) ? trim(removeBom((string) $row[$nameIndex])) : '';
    if ($name === '') continue;

    $ticker = $tickerIndex >= 0 && isset($row[$tickerIndex]) ? trim((string) $row[$tickerIndex]) : '';
    $aliasesRaw = $aliasesIndex >= 0 && isset($row[$aliasesIndex]) ? trim((string) $row[$aliasesIndex]) : '';
    $excludeRaw = $excludeIndex >= 0 && isset($row[$excludeIndex]) ? trim((string) $row[$excludeIndex]) : '';

    $searchTerms = [$name];
    if ($ticker !== '') $searchTerms[] = $ticker;
    $searchTerms = array_merge($searchTerms, splitTerms($aliasesRaw));
    $searchTerms = uniqueNonEmpty($searchTerms);

    $excludeTerms = uniqueNonEmpty(splitTerms($excludeRaw));

    $companies[] = [
      'name' => $name,
      'ticker' => $ticker,
      'searchTerms' => $searchTerms,
      'excludeTerms' => $excludeTerms
    ];
  }

  fclose($handle);
  return $companies;
}

function findHeaderIndex($header, $names) {
  foreach ($names as $name) {
    $index = array_search(strtolower($name), $header, true);
    if ($index !== false) return $index;
  }
  return -1;
}

function removeBom($text) {
  return preg_replace('/^\xEF\xBB\xBF/', '', $text);
}

function splitTerms($raw) {
  if ($raw === '') return [];
  $parts = preg_split('/[|;,]/', $raw);
  return array_map('trim', $parts ?: []);
}

function uniqueNonEmpty($values) {
  $seen = [];
  $out = [];
  foreach ($values as $value) {
    $value = trim((string) $value);
    if ($value === '') continue;
    $key = strtolower($value);
    if (isset($seen[$key])) continue;
    $seen[$key] = true;
    $out[] = $value;
  }
  return $out;
}

function findCompanyConfig($companies, $companyParam) {
  $target = strtolower(trim($companyParam));
  foreach ($companies as $company) {
    if (strtolower($company['name']) === $target) return $company;
  }
  return null;
}

// ======================================================
// External API fetchers
// ======================================================

function fetchNewsApiItems($companyConfig, $apiKey, $pageSize) {
  $query = buildNewsQuery($companyConfig);
  $params = [
    'q' => $query,
    'language' => 'en',
    'sortBy' => 'publishedAt',
    'pageSize' => $pageSize,
    'apiKey' => $apiKey
  ];

  $url = 'https://newsapi.org/v2/everything?' . http_build_query($params);
  $data = curlGetJson($url, [], 8);

  if (!isset($data['status']) || $data['status'] !== 'ok') {
    $message = isset($data['message']) ? $data['message'] : 'unexpected NewsAPI response';
    throw new Exception($message);
  }

  $articles = isset($data['articles']) && is_array($data['articles']) ? $data['articles'] : [];
  $items = [];

  foreach ($articles as $article) {
    $url = isset($article['url']) ? (string) $article['url'] : '';
    if ($url === '') continue;

    $items[] = [
      'rawKind' => 'news',
      'rawTitle' => cleanText($article['title'] ?? ''),
      'rawDescription' => cleanText($article['description'] ?? ''),
      'sourceName' => cleanText($article['source']['name'] ?? 'News'),
      'publishedAtRaw' => (string) ($article['publishedAt'] ?? ''),
      'url' => $url
    ];
  }

  return $items;
}

function fetchXRecentPosts($companyConfig, $bearerToken, $maxResults) {
  $query = buildXQuery($companyConfig);
  $params = [
    'query' => $query,
    'max_results' => $maxResults,
    'tweet.fields' => 'created_at,lang,public_metrics',
    'expansions' => 'author_id',
    'user.fields' => 'username,name'
  ];

  $url = 'https://api.x.com/2/tweets/search/recent?' . http_build_query($params);
  $headers = [
    'Authorization: Bearer ' . $bearerToken
  ];

  $data = curlGetJson($url, $headers, 8);

  if (isset($data['errors']) && is_array($data['errors']) && count($data['errors']) > 0) {
    $message = $data['errors'][0]['detail'] ?? $data['errors'][0]['title'] ?? 'X API error';
    throw new Exception($message);
  }

  $tweets = isset($data['data']) && is_array($data['data']) ? $data['data'] : [];
  $users = [];

  if (isset($data['includes']['users']) && is_array($data['includes']['users'])) {
    foreach ($data['includes']['users'] as $user) {
      if (isset($user['id'])) $users[(string) $user['id']] = $user;
    }
  }

  $items = [];
  foreach ($tweets as $tweet) {
    $id = isset($tweet['id']) ? (string) $tweet['id'] : '';
    if ($id === '') continue;

    $authorId = isset($tweet['author_id']) ? (string) $tweet['author_id'] : '';
    $username = $authorId !== '' && isset($users[$authorId]['username']) ? $users[$authorId]['username'] : '';
    $url = $username !== '' ? 'https://x.com/' . rawurlencode($username) . '/status/' . rawurlencode($id) : 'https://x.com/i/web/status/' . rawurlencode($id);

    $metrics = isset($tweet['public_metrics']) && is_array($tweet['public_metrics']) ? $tweet['public_metrics'] : [];
    $engagement = intval($metrics['like_count'] ?? 0)
      + intval($metrics['retweet_count'] ?? 0)
      + intval($metrics['reply_count'] ?? 0)
      + intval($metrics['quote_count'] ?? 0);

    $items[] = [
      'rawKind' => 'sns',
      'rawText' => cleanText($tweet['text'] ?? ''),
      'sourceName' => 'X',
      'publishedAtRaw' => (string) ($tweet['created_at'] ?? ''),
      'url' => $url,
      'engagement' => $engagement
    ];
  }

  return $items;
}

function curlGetJson($url, $headers = [], $timeoutSeconds = 8) {
  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_TIMEOUT, $timeoutSeconds);
  curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

  $finalHeaders = array_merge([
    'Accept: application/json',
    'User-Agent: GlovetyObservatory/1.0'
  ], $headers);

  curl_setopt($ch, CURLOPT_HTTPHEADER, $finalHeaders);

  $body = curl_exec($ch);
  $error = curl_error($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  if ($body === false || $body === '') {
    throw new Exception($error ?: 'empty response');
  }

  if ($httpCode >= 400) {
    $decodedError = json_decode($body, true);
    $message = $decodedError['message'] ?? $decodedError['detail'] ?? ('HTTP ' . $httpCode);
    throw new Exception($message);
  }

  $json = json_decode($body, true);
  if (!is_array($json)) {
    throw new Exception('invalid JSON response');
  }

  return $json;
}

// ======================================================
// Query builders
// ======================================================

function buildNewsQuery($companyConfig) {
  $terms = array_slice($companyConfig['searchTerms'], 0, 5);
  $quoted = array_map(function ($term) {
    return '"' . str_replace('"', '', $term) . '"';
  }, $terms);

  $query = implode(' OR ', $quoted);

  foreach ($companyConfig['excludeTerms'] as $exclude) {
    $query .= ' -"' . str_replace('"', '', $exclude) . '"';
  }

  return $query;
}

function buildXQuery($companyConfig) {
  $terms = array_slice($companyConfig['searchTerms'], 0, 4);
  $quoted = array_map(function ($term) {
    return '"' . str_replace('"', '', $term) . '"';
  }, $terms);

  $query = '(' . implode(' OR ', $quoted) . ') lang:en -is:retweet';

  foreach ($companyConfig['excludeTerms'] as $exclude) {
    $query .= ' -"' . str_replace('"', '', $exclude) . '"';
  }

  // Keep it short for lower-tier X access.
  if (strlen($query) > 480) {
    $query = '"' . str_replace('"', '', $companyConfig['name']) . '" lang:en -is:retweet';
  }

  return $query;
}

// ======================================================
// Signal item builders
// ======================================================

function buildNewsSignalItem($raw, $companyName, $enableLlm, $openAiKey, $openAiModel) {
  $sourceText = trim(($raw['rawTitle'] ?? '') . ' ' . ($raw['rawDescription'] ?? ''));
  $topic = makeTopicLabel($sourceText);
  $summary = summarizeHeuristically($sourceText, $companyName, 'news');
  $signalTitle = $topic . ' coverage';

  if ($enableLlm && $openAiKey !== '' && $sourceText !== '') {
    $llm = openAiSignalize($openAiKey, $openAiModel, $companyName, 'news', $sourceText);
    if ($llm) {
      $topic = $llm['topicLabel'] ?: $topic;
      $summary = $llm['summary'] ?: $summary;
      $signalTitle = $llm['title'] ?: ($topic . ' coverage');
    }
  }

  return [
    'kind' => 'news',
    'title' => $signalTitle,
    'topicLabel' => $topic,
    'summary' => $summary,
    'source' => $raw['sourceName'] ?? 'News',
    'publishedAt' => relativeTime($raw['publishedAtRaw'] ?? ''),
    'url' => $raw['url'] ?? '',
    'weight' => 1.5
  ];
}

function buildSnsSignalItem($raw, $companyName, $enableLlm, $openAiKey, $openAiModel) {
  $sourceText = trim($raw['rawText'] ?? '');
  $topic = makeTopicLabel($sourceText);
  $summary = summarizeHeuristically($sourceText, $companyName, 'sns');
  $signalTitle = $topic . ' discussion';

  if ($enableLlm && $openAiKey !== '' && $sourceText !== '') {
    $llm = openAiSignalize($openAiKey, $openAiModel, $companyName, 'sns', $sourceText);
    if ($llm) {
      $topic = $llm['topicLabel'] ?: $topic;
      $summary = $llm['summary'] ?: $summary;
      $signalTitle = $llm['title'] ?: ($topic . ' discussion');
    }
  }

  $engagement = intval($raw['engagement'] ?? 0);
  $weight = 1.0 + min(2.0, log10($engagement + 1) / 2.0);

  return [
    'kind' => 'sns',
    'title' => $signalTitle,
    'topicLabel' => $topic,
    'summary' => $summary,
    'source' => $raw['sourceName'] ?? 'X',
    'publishedAt' => relativeTime($raw['publishedAtRaw'] ?? ''),
    'url' => $raw['url'] ?? '',
    'weight' => $weight
  ];
}

function makeTopicLabel($text) {
  $lower = strtolower($text);

  if (containsAny($lower, ['ai', 'artificial intelligence', 'machine learning', 'chatbot', 'llm'])) return 'AI strategy';
  if (containsAny($lower, ['earnings', 'revenue', 'profit', 'guidance', 'margin', 'quarter'])) return 'Earnings outlook';
  if (containsAny($lower, ['customer', 'consumer', 'pricing', 'service', 'loyalty'])) return 'Customer experience';
  if (containsAny($lower, ['supply chain', 'logistics', 'inventory', 'warehouse', 'automation'])) return 'Supply chain shift';
  if (containsAny($lower, ['climate', 'sustainability', 'emissions', 'carbon', 'recycling'])) return 'Sustainability signal';
  if (containsAny($lower, ['labor', 'worker', 'employee', 'union', 'wage', 'culture'])) return 'Labor and culture';
  if (containsAny($lower, ['product', 'launch', 'demand', 'store', 'brand', 'category'])) return 'Product momentum';
  if (containsAny($lower, ['stock', 'shares', 'market', 'investor', 'analyst'])) return 'Market attention';

  return 'General attention';
}

function summarizeHeuristically($text, $companyName, $kind) {
  $topic = makeTopicLabel($text);
  if ($kind === 'sns') {
    return 'Public conversation around ' . $companyName . ' is clustering around ' . strtolower($topic) . '.';
  }
  return 'Recent coverage around ' . $companyName . ' is focused on ' . strtolower($topic) . '.';
}

function containsAny($text, $needles) {
  foreach ($needles as $needle) {
    if (strpos($text, $needle) !== false) return true;
  }
  return false;
}

function cleanText($text) {
  $text = html_entity_decode((string) $text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
  $text = preg_replace('/\s+/', ' ', $text);
  return trim($text);
}

function relativeTime($iso) {
  if (!$iso) return '';
  $time = strtotime($iso);
  if (!$time) return '';

  $diff = time() - $time;
  if ($diff < 60) return 'now';
  if ($diff < 3600) return max(1, floor($diff / 60)) . 'm ago';
  if ($diff < 86400) return floor($diff / 3600) . 'h ago';
  return floor($diff / 86400) . 'd ago';
}

// ======================================================
// Optional OpenAI signalization
// ======================================================

function openAiSignalize($apiKey, $model, $companyName, $kind, $sourceText) {
  $sourceText = mb_substr($sourceText, 0, 900);

  $system = 'You convert raw public attention items into concise non-verbatim signal metadata for a corporate gravity visualization. Do not quote the source text verbatim. Return compact JSON only.';
  $user = "Company: {$companyName}\nSource type: {$kind}\nRaw item:\n{$sourceText}\n\nReturn JSON with keys: title, topicLabel, summary. Title should be a short signal title, not a copied headline/post. Summary must be one sentence in your own words.";

  $payload = [
    'model' => $model,
    'messages' => [
      ['role' => 'system', 'content' => $system],
      ['role' => 'user', 'content' => $user]
    ],
    'response_format' => [
      'type' => 'json_schema',
      'json_schema' => [
        'name' => 'attention_signal',
        'strict' => true,
        'schema' => [
          'type' => 'object',
          'additionalProperties' => false,
          'required' => ['title', 'topicLabel', 'summary'],
          'properties' => [
            'title' => ['type' => 'string'],
            'topicLabel' => ['type' => 'string'],
            'summary' => ['type' => 'string']
          ]
        ]
      ]
    ],
    'temperature' => 0.2,
    'max_tokens' => 160
  ];

  try {
    $data = curlPostJson('https://api.openai.com/v1/chat/completions', $payload, [
      'Authorization: Bearer ' . $apiKey
    ], 10);

    $content = $data['choices'][0]['message']['content'] ?? '';
    $decoded = json_decode($content, true);
    if (!is_array($decoded)) return null;

    return [
      'title' => cleanText($decoded['title'] ?? ''),
      'topicLabel' => cleanText($decoded['topicLabel'] ?? ''),
      'summary' => cleanText($decoded['summary'] ?? '')
    ];
  } catch (Throwable $e) {
    return null;
  }
}

function curlPostJson($url, $payload, $headers = [], $timeoutSeconds = 10) {
  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_TIMEOUT, $timeoutSeconds);
  curl_setopt($ch, CURLOPT_POST, true);
  curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

  $finalHeaders = array_merge([
    'Content-Type: application/json',
    'Accept: application/json',
    'User-Agent: GlovetyObservatory/1.0'
  ], $headers);
  curl_setopt($ch, CURLOPT_HTTPHEADER, $finalHeaders);

  $body = curl_exec($ch);
  $error = curl_error($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  if ($body === false || $body === '') {
    throw new Exception($error ?: 'empty response');
  }

  if ($httpCode >= 400) {
    $decodedError = json_decode($body, true);
    $message = $decodedError['error']['message'] ?? $decodedError['message'] ?? ('HTTP ' . $httpCode);
    throw new Exception($message);
  }

  $json = json_decode($body, true);
  if (!is_array($json)) {
    throw new Exception('invalid JSON response');
  }

  return $json;
}
