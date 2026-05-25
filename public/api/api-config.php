<?php
return [
  'NEWS_API_KEY' => 'あなたのNewsAPIキー',
  'X_BEARER_TOKEN' => 'あなたのX API Bearer Token',
  'OPENAI_API_KEY' => 'あなたのOpenAI APIキー',

  // 最初は false 推奨。News/Xが動いてから true にする
  'ENABLE_OPENAI_TOPICING' => 'false',

  'OPENAI_MODEL' => 'gpt-4.1-mini',
  'CACHE_TTL_SECONDS' => '300',
  'NEWS_PAGE_SIZE' => '8',
  'X_MAX_RESULTS' => '10'
];
