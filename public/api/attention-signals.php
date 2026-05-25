<?php
/**
 * Glovety Observatory - RSS Attention Signals API
 *
 * Place at:
 *   public/api/attention-signals.php   (GitHub / Vite public folder)
 * After build/deploy:
 *   public_html/api/attention-signals.php
 *
 * Request:
 *   /api/attention-signals.php?company=Walmart
 *   /api/attention-signals.php?company=Walmart&debug=1
 *
 * Response shape matches main.js:
 *   {
 *     company,
 *     updatedAt,
 *     snsItems: [],
 *     newsItems: [...]
 *   }
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

$config = loadConfig();

$companyParam = isset($_GET['company']) ? trim((string)$_GET['company']) : '';
$debug = isset($_GET['debug']) && (string)$_GET['debug'] === '1';

if ($companyParam === '') {
  respondJson([
    'error' => 'company is required',
    'company' => '',
    'updatedAt' => date(DATE_ATOM),
    'snsItems' => [],
    'newsItems' => []
  ], 400);
}

$csvPath = findCompaniesCsvPath();

if ($csvPath === null) {
  respondJson([
    'error' => 'companies_002.csv not found',
    'company' => $companyParam,
    'updatedAt' => date(DATE_ATOM),
    'snsItems' => [],
    'newsItems' => [],
    'debug' => $debug ? [
      'checkedPaths' => getCandidateCsvPaths()
    ] : null
  ], 500);
}

$companies = loadCompaniesFromCsv($csvPath);
$company = findCompanyByName($companies, $companyParam);

if ($company === null) {
  respondJson([
    'error' => 'company not found in companies_002.csv',
    'company' => $companyParam,
    'updatedAt' => date(DATE_ATOM),
    'snsItems' => [],
    'newsItems' => []
  ], 404);
}

$cacheTtl = (int)($config['CACHE_TTL_SECONDS'] ?? $config['RSS_CACHE_TTL_SECONDS'] ?? 300);
$cacheKey = sha1('rss-attention-v2|' . $company['name']);
$cached = readCache($cacheKey, $cacheTtl);

if ($cached !== null) {
  if ($debug) {
    $cached['debug'] = array_merge($cached['debug'] ?? [], [
      'cache' => 'hit',
      'cacheTtlSeconds' => $cacheTtl,
      'csvPath' => $csvPath
    ]);
  }
  respondJson($cached);
}

$searchTerms = buildSearchTerms($company);
$excludeTerms = buildExcludeTerms($company);
$maxItems = (int)($config['RSS_MAX_ITEMS'] ?? $config['NEWS_PAGE_SIZE'] ?? 12);
$lookbackDays = (int)($config['RSS_LOOKBACK_DAYS'] ?? 7);

$rssUrls = buildRssUrls($searchTerms, $lookbackDays, $config);
$rawArticles = [];

foreach ($rssUrls as $url) {
  $xmlText = fetchUrl($url, 8);
  if ($xmlText === null || $xmlText === '') {
    continue;
  }

  $items = parseRssItems($xmlText);
  foreach ($items as $item) {
    $item['rssUrl'] = $url;
    $rawArticles[] = $item;
  }
}

$filtered = [];
$seen = [];

foreach ($rawArticles as $article) {
  $title = $article['title'] ?? '';
  $description = $article['description'] ?? '';
  $link = $article['url'] ?? '';

  if ($title === '' || $link === '') {
    continue;
  }

  if (!isRelevantToCompany($title . ' ' . $description, $searchTerms, $excludeTerms)) {
    continue;
  }

  $dedupeKey = sha1(normalizeText($title) . '|' . normalizeUrlForDedupe($link));
  if (isset($seen[$dedupeKey])) {
    continue;
  }
  $seen[$dedupeKey] = true;

  $filtered[] = $article;
}

usort($filtered, function ($a, $b) {
  $ta = strtotime($a['publishedAtIso'] ?? '') ?: 0;
  $tb = strtotime($b['publishedAtIso'] ?? '') ?: 0;
  return $tb <=> $ta;
});

$filtered = array_slice($filtered, 0, $maxItems);

$newsItems = array_map(function ($article) use ($company) {
  $title = cleanTitle((string)($article['title'] ?? 'News coverage'));
  $description = cleanDescription((string)($article['description'] ?? ''));
  $source = (string)($article['source'] ?? 'RSS News');
  $url = (string)($article['url'] ?? '');
  $publishedAtIso = (string)($article['publishedAtIso'] ?? '');

  $textForTopic = $title . ' ' . $description;

  return [
    'kind' => 'news',
    'title' => $title !== '' ? $title : 'News coverage',
    'topicLabel' => makeTopicLabel($textForTopic),
    'summary' => makeSummary($description, $title, $company['name']),
    'source' => $source !== '' ? $source : 'RSS News',
    'publishedAt' => relativeTime($publishedAtIso),
    'publishedAtIso' => $publishedAtIso,
    'url' => $url,
    'weight' => calculateWeight($publishedAtIso)
  ];
}, $filtered);

$response = [
  'company' => $company['name'],
  'updatedAt' => date(DATE_ATOM),
  'sourceType' => 'rss',
  'snsItems' => [],     // SNS Orbitは後でX API等に接続。今はNews OrbitをRSSで本物化。
  'newsItems' => $newsItems
];

if ($debug) {
  $response['debug'] = [
    'cache' => 'miss',
    'cacheTtlSeconds' => $cacheTtl,
    'csvPath' => $csvPath,
    'company' => $company,
    'searchTerms' => $searchTerms,
    'excludeTerms' => $excludeTerms,
    'rssUrls' => $rssUrls,
    'rawArticleCount' => count($rawArticles),
    'filteredArticleCount' => count($filtered),
    'maxItems' => $maxItems,
    'lookbackDays' => $lookbackDays
  ];
}

writeCache($cacheKey, $response);
respondJson($response);


// ======================================================
// Config
// ======================================================

function loadConfig(): array {
  $configPath = __DIR__ . '/api-config.php';

  if (file_exists($configPath)) {
    $loaded = include $configPath;
    if (is_array($loaded)) {
      return $loaded;
    }
  }

  return [
    'CACHE_TTL_SECONDS' => '300',
    'RSS_MAX_ITEMS' => '12',
    'RSS_LOOKBACK_DAYS' => '7',
    'RSS_LOCALE' => 'US:en'
  ];
}


// ======================================================
// CSV company master
// ======================================================

function getCandidateCsvPaths(): array {
  return [
    __DIR__ . '/../companies_002.csv',
    __DIR__ . '/../assets/companies_002.csv',
    __DIR__ . '/../../companies_002.csv',
    __DIR__ . '/../../assets/companies_002.csv'
  ];
}

function findCompaniesCsvPath(): ?string {
  foreach (getCandidateCsvPaths() as $path) {
    if (file_exists($path)) {
      return $path;
    }
  }
  return null;
}

function loadCompaniesFromCsv(string $csvPath): array {
  $handle = fopen($csvPath, 'r');
  if (!$handle) {
    return [];
  }

  $header = fgetcsv($handle);
  if (!$header) {
    fclose($handle);
    return [];
  }

  $header = array_map(function ($value) {
    return strtolower(trim((string)$value));
  }, $header);

  $nameIndex = findColumnIndex($header, ['name', 'company', 'company_name', 'companykey']);
  if ($nameIndex === null) {
    $nameIndex = 0;
  }

  $tickerIndex = findColumnIndex($header, ['ticker', 'symbol']);
  $aliasesIndex = findColumnIndex($header, ['aliases', 'alias', 'search_terms', 'searchterms']);
  $excludeIndex = findColumnIndex($header, ['exclude_terms', 'exclude', 'negative_terms']);

  $companies = [];

  while (($row = fgetcsv($handle)) !== false) {
    if (count($row) === 0) continue;

    $name = isset($row[$nameIndex]) ? trim((string)$row[$nameIndex]) : '';
    if ($name === '') continue;

    $ticker = $tickerIndex !== null && isset($row[$tickerIndex]) ? trim((string)$row[$tickerIndex]) : '';
    $aliases = $aliasesIndex !== null && isset($row[$aliasesIndex]) ? trim((string)$row[$aliasesIndex]) : '';
    $excludeTerms = $excludeIndex !== null && isset($row[$excludeIndex]) ? trim((string)$row[$excludeIndex]) : '';

    $companies[] = [
      'name' => $name,
      'ticker' => $ticker,
      'aliases' => splitTerms($aliases),
      'excludeTerms' => splitTerms($excludeTerms)
    ];
  }

  fclose($handle);
  return $companies;
}

function findColumnIndex(array $header, array $candidates): ?int {
  foreach ($candidates as $candidate) {
    $idx = array_search(strtolower($candidate), $header, true);
    if ($idx !== false) {
      return (int)$idx;
    }
  }
  return null;
}

function findCompanyByName(array $companies, string $companyParam): ?array {
  $needle = normalizeCompanyName($companyParam);

  foreach ($companies as $company) {
    if (normalizeCompanyName($company['name']) === $needle) {
      return $company;
    }
  }

  // 末尾のInc/Corpなどを無視した緩い照合
  foreach ($companies as $company) {
    if (normalizeLooseCompanyName($company['name']) === normalizeLooseCompanyName($companyParam)) {
      return $company;
    }
  }

  return null;
}

function normalizeCompanyName(string $value): string {
  return strtolower(trim($value));
}

function normalizeLooseCompanyName(string $value): string {
  $v = strtolower(trim($value));
  $v = preg_replace('/\b(inc|inc\.|corp|corp\.|corporation|co|co\.|company|ltd|ltd\.|plc|holdings|holding)\b/u', '', $v);
  $v = preg_replace('/[^a-z0-9]+/u', '', $v);
  return $v ?? '';
}

function splitTerms(string $value): array {
  if ($value === '') return [];
  $parts = preg_split('/[|;,]/u', $value);
  $parts = array_map('trim', $parts ?: []);
  return array_values(array_filter($parts, fn($x) => $x !== ''));
}

function buildSearchTerms(array $company): array {
  $terms = [$company['name']];

  if (!empty($company['ticker'])) {
    $terms[] = $company['ticker'];
  }

  foreach (($company['aliases'] ?? []) as $alias) {
    $terms[] = $alias;
  }

  $terms = array_values(array_unique(array_filter(array_map('trim', $terms), fn($x) => $x !== '')));
  return $terms;
}

function buildExcludeTerms(array $company): array {
  return $company['excludeTerms'] ?? [];
}


// ======================================================
// RSS fetch / parse
// ======================================================

function buildRssUrls(array $searchTerms, int $lookbackDays, array $config): array {
  $locale = (string)($config['RSS_LOCALE'] ?? 'US:en');
  [$gl, $langShort] = array_pad(explode(':', $locale, 2), 2, 'en');

  $hl = $langShort === 'ja' ? 'ja' : 'en-US';
  $ceid = rawurlencode($locale);

  $query = buildNewsSearchQuery($searchTerms, $lookbackDays);
  $encodedQuery = rawurlencode($query);

  $urls = [
    "https://news.google.com/rss/search?q={$encodedQuery}&hl={$hl}&gl={$gl}&ceid={$ceid}"
  ];

  // 追加RSSをapi-config.phpで指定可能。
  // 例: 'EXTRA_RSS_URLS' => ['https://example.com/feed.xml']
  if (!empty($config['EXTRA_RSS_URLS']) && is_array($config['EXTRA_RSS_URLS'])) {
    foreach ($config['EXTRA_RSS_URLS'] as $extraUrl) {
      if (is_string($extraUrl) && trim($extraUrl) !== '') {
        $urls[] = trim($extraUrl);
      }
    }
  }

  return array_values(array_unique($urls));
}

function buildNewsSearchQuery(array $searchTerms, int $lookbackDays): string {
  $safeTerms = array_values(array_filter($searchTerms, fn($term) => trim((string)$term) !== ''));

  if (count($safeTerms) === 0) {
    return '';
  }

  $parts = array_map(function ($term) {
    $term = trim((string)$term);
    // Google News RSS向け。企業名/aliasはフレーズ検索にする。
    return '"' . str_replace('"', '', $term) . '"';
  }, array_slice($safeTerms, 0, 5));

  $query = count($parts) === 1
    ? $parts[0]
    : '(' . implode(' OR ', $parts) . ')';

  if ($lookbackDays > 0) {
    $query .= ' when:' . max(1, $lookbackDays) . 'd';
  }

  return $query;
}

function fetchUrl(string $url, int $timeoutSeconds = 8): ?string {
  $ch = curl_init($url);
  if ($ch === false) {
    return null;
  }

  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_CONNECTTIMEOUT => $timeoutSeconds,
    CURLOPT_TIMEOUT => $timeoutSeconds,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_USERAGENT => 'GlovetyObservatory/1.0 (+https://glovety.com)'
  ]);

  $body = curl_exec($ch);
  $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  if ($body === false || $httpCode >= 400) {
    return null;
  }

  return (string)$body;
}

function parseRssItems(string $xmlText): array {
  $items = [];

  libxml_use_internal_errors(true);
  $xml = simplexml_load_string($xmlText, 'SimpleXMLElement', LIBXML_NOCDATA);
  if (!$xml) {
    libxml_clear_errors();
    return [];
  }

  // RSS 2.0
  if (isset($xml->channel->item)) {
    foreach ($xml->channel->item as $item) {
      $source = '';
      if (isset($item->source)) {
        $source = trim((string)$item->source);
      }

      $items[] = [
        'title' => trim((string)$item->title),
        'description' => trim((string)$item->description),
        'url' => trim((string)$item->link),
        'source' => $source !== '' ? $source : inferSourceFromUrl(trim((string)$item->link)),
        'publishedAtIso' => normalizeDate((string)$item->pubDate)
      ];
    }
  }

  // Atom
  if (isset($xml->entry)) {
    foreach ($xml->entry as $entry) {
      $link = '';
      if (isset($entry->link)) {
        foreach ($entry->link as $l) {
          $attrs = $l->attributes();
          if (isset($attrs['href'])) {
            $link = (string)$attrs['href'];
            break;
          }
        }
      }

      $items[] = [
        'title' => trim((string)$entry->title),
        'description' => trim((string)($entry->summary ?? $entry->content ?? '')),
        'url' => trim($link),
        'source' => inferSourceFromUrl($link),
        'publishedAtIso' => normalizeDate((string)($entry->updated ?? $entry->published ?? ''))
      ];
    }
  }

  libxml_clear_errors();
  return $items;
}

function normalizeDate(string $value): string {
  $time = strtotime($value);
  if (!$time) {
    return '';
  }
  return date(DATE_ATOM, $time);
}

function inferSourceFromUrl(string $url): string {
  $host = parse_url($url, PHP_URL_HOST);
  if (!$host) return 'RSS News';
  $host = preg_replace('/^www\./', '', strtolower($host));
  return $host ?: 'RSS News';
}


// ======================================================
// Filtering / shaping
// ======================================================

function isRelevantToCompany(string $text, array $searchTerms, array $excludeTerms): bool {
  $normalizedText = normalizeText($text);

  foreach ($excludeTerms as $exclude) {
    if ($exclude !== '' && str_contains($normalizedText, normalizeText($exclude))) {
      return false;
    }
  }

  foreach ($searchTerms as $term) {
    $term = trim((string)$term);
    if ($term === '') continue;

    $normalizedTerm = normalizeText($term);

    // 短いtickerは単語境界で見る
    if (strlen($normalizedTerm) <= 4 && preg_match('/^[a-z0-9]+$/i', $normalizedTerm)) {
      if (preg_match('/\b' . preg_quote($normalizedTerm, '/') . '\b/i', $normalizedText)) {
        return true;
      }
      continue;
    }

    if (str_contains($normalizedText, $normalizedTerm)) {
      return true;
    }
  }

  return false;
}

function normalizeText(string $value): string {
  $value = html_entity_decode(strip_tags($value), ENT_QUOTES | ENT_HTML5, 'UTF-8');
  $value = strtolower($value);
  $value = preg_replace('/\s+/u', ' ', $value);
  return trim($value ?? '');
}

function normalizeUrlForDedupe(string $url): string {
  $parts = parse_url($url);
  if (!$parts) return $url;

  $host = $parts['host'] ?? '';
  $path = $parts['path'] ?? '';

  return strtolower($host . $path);
}

function cleanTitle(string $title): string {
  $title = html_entity_decode(strip_tags($title), ENT_QUOTES | ENT_HTML5, 'UTF-8');
  $title = preg_replace('/\s+/u', ' ', $title);
  return trim($title ?? '');
}

function cleanDescription(string $description): string {
  $description = html_entity_decode(strip_tags($description), ENT_QUOTES | ENT_HTML5, 'UTF-8');
  $description = preg_replace('/\s+/u', ' ', $description);
  return trim($description ?? '');
}

function makeSummary(string $description, string $title, string $companyName): string {
  $base = $description !== '' ? $description : $title;

  if ($base === '') {
    return 'Recent RSS news signal detected for ' . $companyName . '.';
  }

  $maxLen = 220;
  if (mb_strlen($base, 'UTF-8') > $maxLen) {
    return mb_substr($base, 0, $maxLen - 1, 'UTF-8') . '…';
  }

  return $base;
}

function makeTopicLabel(string $text): string {
  $lower = normalizeText($text);

  if (containsAny($lower, ['ai', 'artificial intelligence', 'machine learning', 'llm', 'genai'])) {
    return 'AI strategy';
  }
  if (containsAny($lower, ['earnings', 'revenue', 'profit', 'guidance', 'margin', 'quarterly results'])) {
    return 'Earnings outlook';
  }
  if (containsAny($lower, ['supply chain', 'logistics', 'warehouse', 'distribution', 'inventory'])) {
    return 'Supply chain shift';
  }
  if (containsAny($lower, ['climate', 'sustainability', 'emissions', 'carbon', 'recycling'])) {
    return 'Sustainability signal';
  }
  if (containsAny($lower, ['labor', 'worker', 'union', 'wage', 'employee', 'workforce'])) {
    return 'Labor and culture';
  }
  if (containsAny($lower, ['product', 'launch', 'device', 'store', 'brand', 'demand'])) {
    return 'Product momentum';
  }
  if (containsAny($lower, ['lawsuit', 'regulator', 'antitrust', 'sec', 'investigation'])) {
    return 'Regulatory signal';
  }
  if (containsAny($lower, ['stock', 'shares', 'market', 'analyst', 'rating'])) {
    return 'Market signal';
  }

  return 'General coverage';
}

function containsAny(string $text, array $needles): bool {
  foreach ($needles as $needle) {
    if (str_contains($text, strtolower($needle))) {
      return true;
    }
  }
  return false;
}

function relativeTime(string $iso): string {
  if ($iso === '') return '';

  $time = strtotime($iso);
  if (!$time) return '';

  $diff = time() - $time;
  if ($diff < 0) $diff = 0;

  if ($diff < 3600) return max(1, (int)floor($diff / 60)) . 'm ago';
  if ($diff < 86400) return (int)floor($diff / 3600) . 'h ago';
  return (int)floor($diff / 86400) . 'd ago';
}

function calculateWeight(string $iso): float {
  if ($iso === '') return 1.2;

  $time = strtotime($iso);
  if (!$time) return 1.2;

  $hours = max(0, (time() - $time) / 3600);

  if ($hours <= 6) return 2.0;
  if ($hours <= 24) return 1.7;
  if ($hours <= 72) return 1.4;
  return 1.15;
}


// ======================================================
// Cache
// ======================================================

function getCacheDir(): string {
  return __DIR__ . '/cache';
}

function readCache(string $key, int $ttlSeconds): ?array {
  if ($ttlSeconds <= 0) return null;

  $path = getCacheDir() . '/' . $key . '.json';
  if (!file_exists($path)) return null;

  $age = time() - filemtime($path);
  if ($age > $ttlSeconds) return null;

  $json = file_get_contents($path);
  if ($json === false) return null;

  $data = json_decode($json, true);
  return is_array($data) ? $data : null;
}

function writeCache(string $key, array $data): void {
  $dir = getCacheDir();
  if (!is_dir($dir)) {
    @mkdir($dir, 0755, true);
  }

  if (!is_dir($dir) || !is_writable($dir)) {
    return;
  }

  $path = $dir . '/' . $key . '.json';
  @file_put_contents($path, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
}


// ======================================================
// Response
// ======================================================

function respondJson(array $data, int $statusCode = 200): void {
  http_response_code($statusCode);

  // null debugを消す
  if (array_key_exists('debug', $data) && $data['debug'] === null) {
    unset($data['debug']);
  }

  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
