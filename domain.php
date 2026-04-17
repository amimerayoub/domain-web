<?php
/**
 * Dot-o-mator PHP Clone
 * Domain Name Generator — Full Implementation
 * Inspired by dotomator.com
 *
 * Features:
 *  - Word category lists (Beginnings + Endings)
 *  - Combine & check domain availability via WHOIS / DNS
 *  - Check single domain
 *  - Scratchbox (session-based)
 *  - JSON API endpoints (/api/words, /api/combine, /api/checkone)
 *  - Clean HTML UI matching the original layout
 */

session_start();
if (!isset($_SESSION['scratchbox'])) {
    $_SESSION['scratchbox'] = [];
}

// ═══════════════════════════════════════════════════════════════════
//  WORD DATA — Beginnings & Endings categories
// ═══════════════════════════════════════════════════════════════════

function getWordData(): array {
    return [
        // ── BEGINNINGS ─────────────────────────────────────────────
        'beginnings' => [
            'Agile' => [
                'Agile','Swift','Fast','Lean','Quick','Rapid','Nimble','Smart',
                'Sharp','Keen','Brisk','Lively','Speedy','Snappy','Zippy',
            ],
            'Bright' => [
                'Bright','Glow','Shine','Flash','Spark','Beam','Light','Lumi',
                'Radiant','Vivid','Clear','Solar','Blaze','Flare','Aurora',
            ],
            'Colorful' => [
                'Red','Blue','Green','Gold','Silver','Crimson','Azure','Violet',
                'Amber','Ivory','Jade','Coral','Ruby','Indigo','Teal',
            ],
            'Fun and Games' => [
                'Play','Game','Fun','Blast','Arcade','Quest','Champ','Score',
                'Level','Boss','Pixel','Joystick','Rumble','Zap','Turbo',
            ],
            'O-o' => [
                'Oo','Zoo','Boo','Moo','Goo','Woo','Foo','Doo','Hoo','Poo',
                'Shoo','Vroom','Zoom','Boom','Loom',
            ],
            'Online' => [
                'Web','Net','Online','Cyber','Digital','Virtual','Cloud','iNet',
                'eHub','eLink','eSite','ePage','eStore','eSpace','iCloud',
            ],
            'Popular' => [
                'Top','Best','Hot','Cool','Trendy','Prime','Elite','Ultra',
                'Mega','Super','Pro','Plus','Max','Hero','Star',
            ],
            'Small' => [
                'Mini','Micro','Nano','Tiny','Petit','Little','Small','Short',
                'Slim','Thin','Lite','Low','Less','Half','Pocket',
            ],
            'V for ...' => [
                'Velocity','Vision','Valor','Venture','Vibe','Vivid','Vault',
                'Vector','Vertex','Vortex','Vista','Vital','Vigor','Vibrant','Vanguard',
            ],
            'Web 2.0 words' => [
                'Flickr','Tumblr','Digg','Reddit','Wikr','Twittr','Bloggr',
                'Snapr','Linkr','Feedr','Taggr','Trackr','Bookmarkr','Mixr','Sharr',
            ],
        ],

        // ── ENDINGS ────────────────────────────────────────────────
        'endings' => [
            'Animals' => [
                'Bear','Fox','Wolf','Hawk','Eagle','Lion','Tiger','Panda',
                'Falcon','Rhino','Cobra','Viper','Lynx','Bison','Moose',
            ],
            'Birds' => [
                'Owl','Crane','Raven','Finch','Robin','Wren','Swift','Lark',
                'Dove','Sparrow','Hawk','Falcon','Parrot','Jay','Crow',
            ],
            'Boats' => [
                'Boat','Ship','Yacht','Sail','Keel','Helm','Deck','Anchor',
                'Mast','Skipper','Vessel','Fleet','Harbor','Ferry','Raft',
            ],
            'Broadcast/Messages' => [
                'Cast','Broadcast','Stream','Signal','Feed','Wave','Pulse',
                'Channel','Relay','Beacon','Buzz','Ping','Alert','Post','Dispatch',
            ],
            'Bugs' => [
                'Bug','Ant','Bee','Fly','Moth','Flea','Wasp','Gnat',
                'Mite','Tick','Worm','Grub','Larva','Beetle','Cricket',
            ],
            'Builder' => [
                'Builder','Maker','Forge','Craft','Build','Construct','Create',
                'Design','Dev','Code','Factory','Studio','Works','Lab','Shop',
            ],
            'Charts' => [
                'Chart','Graph','Map','Plot','Dash','Board','Track','Metric',
                'Index','Scale','Report','Score','Gauge','Rate','Stat',
            ],
            'Circles' => [
                'Circle','Ring','Loop','Orbit','Spin','Wheel','Cycle','Round',
                'Curl','Spiral','Globe','Sphere','Disk','Hub','Node',
            ],
            'Computer Code' => [
                'Code','Hack','Script','Dev','Byte','Bit','Stack','Array',
                'Loop','Node','Core','Base','Root','Logic','Sync',
            ],
            'Computer Gear' => [
                'Tech','Gear','Chip','Wire','Board','Screen','Drive','Port',
                'Pixel','Grid','Link','Switch','Router','Server','Cloud',
            ],
            'Experts' => [
                'Expert','Guru','Pro','Master','Wizard','Ninja','Ace','Boss',
                'Chief','Lead','Sage','Sensei','Captain','Veteran','Scholar',
            ],
            'Endings' => [
                'ly','ify','ize','tion','ness','ment','able','ful',
                'less','ous','ic','al','ive','er','or',
            ],
            'Endings A-L' => [
                'able','age','al','ance','ary','ate','cy','dom',
                'ence','er','ery','ful','fy','hood','ify',
            ],
            'Endings M-Z' => [
                'ment','ness','or','ous','ship','some','tion','tude',
                'ture','ty','ure','ward','wise','work','worthy',
            ],
            'Friends' => [
                'Buddy','Pal','Mate','Friend','Partner','Ally','Crew','Gang',
                'Squad','Team','Tribe','Club','Circle','Network','Community',
            ],
            'Groups' => [
                'Group','Team','Club','Network','Guild','Union','Band','Pack',
                'Flock','Hive','Swarm','Colony','Clan','Faction','Alliance',
            ],
            'Leaders' => [
                'Chief','Boss','Lead','Head','Captain','Commander','Director',
                'Pilot','Guide','Mentor','Coach','Founder','Pioneer','Champion','Hero',
            ],
            'Robots/Machines' => [
                'Bot','Robot','Mech','Droid','Auto','Machine','Engine','Motor',
                'Gear','Rig','Unit','System','Device','Module','Core',
            ],
            'Merchants' => [
                'Shop','Store','Market','Bazaar','Trade','Sell','Deal','Mart',
                'Plaza','Mall','Exchange','Commerce','Vendor','Trader','Merchant',
            ],
            'Money' => [
                'Cash','Coin','Gold','Pay','Bank','Fund','Wallet','Vault',
                'Rich','Wealth','Profit','Capital','Invest','Budget','Finance',
            ],
            'Places' => [
                'Place','Space','Zone','Area','Land','World','Globe','City',
                'Town','Village','Quarter','District','Hub','Center','Base',
            ],
            'Space' => [
                'Star','Moon','Sun','Orbit','Galaxy','Cosmos','Nebula','Comet',
                'Meteor','Nova','Pulsar','Quasar','Astro','Lunar','Solar',
            ],
            'Roads/Paths' => [
                'Path','Road','Route','Way','Lane','Track','Trail','Pass',
                'Bridge','Junction','Cross','Avenue','Drive','Highway','Street',
            ],
            'Rivers/Flow' => [
                'Flow','Stream','River','Creek','Rush','Cascade','Spring','Wave',
                'Current','Tide','Surge','Drift','Float','Ripple','Run',
            ],
            'Shops' => [
                'Shop','Store','Boutique','Outlet','Depot','Warehouse','Supply',
                'Goods','Deals','Emporium','Gallery','Showroom','Workshop','Studio','Lab',
            ],
            'Storage' => [
                'Vault','Safe','Store','Keep','Hold','Cache','Depot','Bin',
                'Box','Pack','Stack','Archive','Shelf','Rack','Locker',
            ],
            'Talk' => [
                'Talk','Chat','Voice','Speak','Say','Tell','Share','Post',
                'Blog','Buzz','Forum','Board','Thread','Feed','Shout',
            ],
            'Travel' => [
                'Travel','Trip','Tour','Journey','Trek','Voyage','Explore','Roam',
                'Wander','Fly','Cruise','Escape','Venture','Quest','Trail',
            ],
            'Workshop' => [
                'Workshop','Lab','Studio','Forge','Works','Factory','Atelier',
                'Hub','Space','Center','Den','Bay','Loft','Shed','Garage',
            ],
        ],
    ];
}

// ═══════════════════════════════════════════════════════════════════
//  DOMAIN AVAILABILITY CHECK
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if a domain is available via DNS lookup.
 * If DNS returns NXDOMAIN → likely available.
 * Note: Not 100% accurate but free & dependency-less.
 */
function checkDomainAvailability(string $domain): string {
    $domain = trim(strtolower($domain));

    // Basic validation
    if (!preg_match('/^[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]\.[a-z]{2,}$/', $domain)) {
        // Allow short domains too
        if (!preg_match('/^[a-z0-9\-]{1,63}\.[a-z]{2,}$/', $domain)) {
            return 'invalid';
        }
    }

    // Force .com if no extension
    if (strpos($domain, '.') === false) {
        $domain .= '.com';
    }

    // DNS lookup — NXDOMAIN means no record = likely available
    $records = @dns_get_record($domain, DNS_A | DNS_AAAA | DNS_NS);
    if ($records === false || empty($records)) {
        return 'available';
    }
    return 'taken';
}

function sanitizeDomain(string $d): string {
    $d = trim(strtolower($d));
    $d = preg_replace('/[^a-z0-9\.\-]/', '', $d);
    return $d;
}

// ═══════════════════════════════════════════════════════════════════
//  SCRATCHBOX HELPERS
// ═══════════════════════════════════════════════════════════════════

function addToScratchbox(string $domain): void {
    $domain = sanitizeDomain($domain);
    if ($domain && !in_array($domain, $_SESSION['scratchbox'])) {
        $_SESSION['scratchbox'][] = $domain;
    }
}

function clearScratchbox(): void {
    $_SESSION['scratchbox'] = [];
}

// ═══════════════════════════════════════════════════════════════════
//  ROUTER — Handle API and form requests
// ═══════════════════════════════════════════════════════════════════

$requestUri  = $_SERVER['REQUEST_URI'] ?? '/';
$scriptName  = $_SERVER['SCRIPT_NAME'] ?? '';
$path        = parse_url($requestUri, PHP_URL_PATH);
$scriptDir   = dirname($scriptName);
$relativePath = ($scriptDir !== '/')
    ? substr($path, strlen($scriptDir))
    : $path;
$relativePath = '/' . ltrim($relativePath, '/');

// ── API: /api/words ──────────────────────────────────────────────
if ($relativePath === '/api/words' || $relativePath === '/api/words.json') {
    header('Content-Type: application/json');
    $name = $_GET['name'] ?? '';
    $type = $_GET['type'] ?? 'endings'; // 'beginnings' or 'endings'
    $data = getWordData();
    $words = $data[$type][$name] ?? $data['beginnings'][$name] ?? $data['endings'][$name] ?? [];
    echo json_encode(['words' => $words]);
    exit;
}

// ── API: /api/combine ────────────────────────────────────────────
if ($relativePath === '/api/combine' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    $beginnings = array_filter(array_map('trim', explode(',', $_POST['beginnings'] ?? '')));
    $endings    = array_filter(array_map('trim', explode(',', $_POST['endings']    ?? '')));

    if (empty($beginnings) || empty($endings)) {
        echo json_encode(['status' => 'error', 'errmsg' => 'Both beginnings and endings are required.']);
        exit;
    }

    $available = [];
    $taken     = [];

    foreach ($beginnings as $b) {
        foreach ($endings as $e) {
            $domain = sanitizeDomain($b . $e . '.com');
            if (!$domain) continue;
            $result = checkDomainAvailability($domain);
            if ($result === 'available') {
                $available[] = $domain;
            } elseif ($result === 'taken') {
                $taken[] = $domain;
            }
            // Small delay to avoid DNS hammering
            usleep(50000); // 50ms
        }
    }

    echo json_encode([
        'status'    => 'ok',
        'available' => implode(',', $available),
        'taken'     => implode(',', $taken),
    ]);
    exit;
}

// ── API: /api/checkone ───────────────────────────────────────────
if ($relativePath === '/api/checkone' || $relativePath === '/api/checkone.json') {
    header('Content-Type: application/json');
    $name   = sanitizeDomain($_GET['name'] ?? '');
    if (!$name) {
        echo json_encode(['result' => 'invalid']);
        exit;
    }
    // Append .com if no TLD
    if (strpos($name, '.') === false) {
        $name .= '.com';
    }
    $result = checkDomainAvailability($name);
    echo json_encode(['result' => $result]);
    exit;
}

// ── SCRATCHBOX: Add ──────────────────────────────────────────────
if ($relativePath === '/scratchbox/add' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    $domain = sanitizeDomain($_POST['domain'] ?? '');
    addToScratchbox($domain);
    echo json_encode(['status' => 'ok', 'scratchbox' => $_SESSION['scratchbox']]);
    exit;
}

// ── SCRATCHBOX: Clear ────────────────────────────────────────────
if ($relativePath === '/scratchbox/clear' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    clearScratchbox();
    echo json_encode(['status' => 'ok']);
    exit;
}

// ── SCRATCHBOX: Check all ────────────────────────────────────────
if ($relativePath === '/scratchbox/check' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    $results = [];
    foreach ($_SESSION['scratchbox'] as $domain) {
        $results[$domain] = checkDomainAvailability($domain);
        usleep(50000);
    }
    echo json_encode(['status' => 'ok', 'results' => $results]);
    exit;
}

// ═══════════════════════════════════════════════════════════════════
//  HELPERS — Build category options HTML
// ═══════════════════════════════════════════════════════════════════

function categoryOptions(array $categories, string $type): string {
    $html = '<option value="">--Choose/Clear--</option>' . "\n";
    foreach (array_keys($categories) as $name) {
        $esc  = htmlspecialchars($name, ENT_QUOTES);
        $html .= "            <option value=\"{$esc}\" data-type=\"{$type}\">{$esc}</option>\n";
    }
    return $html;
}

$wordData   = getWordData();
$bOptions   = categoryOptions($wordData['beginnings'], 'beginnings');
$eOptions   = categoryOptions($wordData['endings'],    'endings');
$sbList     = $_SESSION['scratchbox'];
$sbValue    = implode("\n", $sbList);
$sbDisabled = empty($sbList) ? 'disabled' : '';

// ── Base URL for API calls ───────────────────────────────────────
$baseUrl = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');

?><!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Dot-o-mator — Domain Name Generator</title>
<style>
/* ══ RESET & BASE ═════════════════════════════════════════════════ */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{font-size:15px;scroll-behavior:smooth}
body{
  font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;
  background:#f4f6f9;
  color:#222;
  min-height:100vh;
  display:flex;
  flex-direction:column;
}

/* ══ HEADER ═══════════════════════════════════════════════════════ */
#header{
  background:linear-gradient(135deg,#1a3a5c 0%,#2563a8 100%);
  color:#fff;
  padding:0 1.5rem;
  box-shadow:0 2px 8px rgba(0,0,0,.25);
}
#navhdr{
  display:flex;
  align-items:center;
  gap:2rem;
  max-width:1100px;
  margin:0 auto;
  height:58px;
}
#logo{
  font-size:1.5rem;
  font-weight:700;
  letter-spacing:-.5px;
  white-space:nowrap;
}
#logo a{color:#fff;text-decoration:none}
#logo sup{font-size:.55rem;vertical-align:super}
nav a{
  color:rgba(255,255,255,.82);
  text-decoration:none;
  font-size:.88rem;
  padding:.3rem .6rem;
  border-radius:4px;
  transition:background .15s;
}
nav a:hover,nav a.active{background:rgba(255,255,255,.18);color:#fff}
nav{display:flex;gap:.25rem;flex-wrap:wrap}

/* ══ INTRO ════════════════════════════════════════════════════════ */
.intro{
  max-width:820px;
  margin:1.4rem auto .6rem;
  padding:0 1rem;
  line-height:1.65;
  color:#444;
  font-size:.95rem;
  text-align:center;
}

/* ══ MAIN GRID ════════════════════════════════════════════════════ */
.main-grid{
  display:grid;
  grid-template-columns: 1fr 40px 1fr 1fr 1fr;
  gap:.75rem;
  max-width:1100px;
  margin:1rem auto 2rem;
  padding:0 1rem;
  flex:1;
}

/* ══ PANEL / CARD ═════════════════════════════════════════════════ */
.panel{
  background:#fff;
  border:1px solid #d1d9e6;
  border-radius:10px;
  padding:1rem 1rem .75rem;
  display:flex;
  flex-direction:column;
  gap:.6rem;
}
.panel h4{
  font-size:.95rem;
  font-weight:700;
  color:#1a3a5c;
  border-bottom:2px solid #e3ecf8;
  padding-bottom:.4rem;
  margin-bottom:.2rem;
}
.plus-cell{
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:1.8rem;
  font-weight:700;
  color:#2563a8;
  padding-top:2.5rem;
}

/* ══ SELECT & TEXTAREA ════════════════════════════════════════════ */
select{
  width:100%;
  padding:.45rem .6rem;
  border:1px solid #c8d5e8;
  border-radius:6px;
  font-size:.85rem;
  background:#f8fafd;
  color:#222;
  cursor:pointer;
}
select:focus{outline:2px solid #2563a8;outline-offset:1px}
textarea{
  width:100%;
  border:1px solid #c8d5e8;
  border-radius:6px;
  padding:.45rem .6rem;
  font-size:.82rem;
  font-family:monospace;
  resize:vertical;
  background:#f8fafd;
  line-height:1.55;
  flex:1;
  min-height:220px;
}
textarea:focus{outline:2px solid #2563a8;outline-offset:1px}
label.small{font-size:.78rem;color:#666;font-weight:600;margin-top:.3rem;display:block}

/* ══ BUTTONS ══════════════════════════════════════════════════════ */
.btn{
  display:inline-block;
  padding:.5rem 1.2rem;
  border-radius:6px;
  border:none;
  font-size:.88rem;
  font-weight:600;
  cursor:pointer;
  transition:background .15s,transform .1s;
}
.btn:active{transform:scale(.97)}
.btn-primary{background:#2563a8;color:#fff}
.btn-primary:hover{background:#1a4a8a}
.btn-primary:disabled{background:#a0b8d4;cursor:not-allowed}
.btn-secondary{background:#e3ecf8;color:#1a3a5c;border:1px solid #c8d5e8}
.btn-secondary:hover{background:#cddaf0}
.btn-secondary:disabled{opacity:.5;cursor:not-allowed}
.btn-danger{background:#dc3545;color:#fff}
.btn-danger:hover{background:#b02a37}
.btn-small{padding:.3rem .75rem;font-size:.8rem}

/* ══ COMBINE PANEL ════════════════════════════════════════════════ */
#combine-panel{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:.75rem;
  padding-top:2.8rem;
}
#status-msg{
  font-size:.82rem;
  color:#e05c00;
  text-align:center;
  min-height:1.2em;
}
#progress{
  font-size:.78rem;
  color:#666;
  text-align:center;
}
.spinner{
  display:none;
  width:28px;height:28px;
  border:3px solid #d1d9e6;
  border-top-color:#2563a8;
  border-radius:50%;
  animation:spin .7s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg)}}

/* ══ RESULTS ══════════════════════════════════════════════════════ */
#results-panel{display:flex;flex-direction:column;gap:.5rem}
.results-header{font-size:.95rem;font-weight:700;color:#1a3a5c;border-bottom:2px solid #e3ecf8;padding-bottom:.4rem}
.avail-count{
  display:inline-block;
  background:#d4edda;
  color:#155724;
  border-radius:999px;
  font-size:.75rem;
  font-weight:700;
  padding:.15rem .6rem;
  margin-left:.5rem;
}
.taken-count{
  display:inline-block;
  background:#f8d7da;
  color:#721c24;
  border-radius:999px;
  font-size:.75rem;
  font-weight:700;
  padding:.15rem .6rem;
  margin-left:.5rem;
}
.domain-item{
  padding:.4rem .6rem;
  border-radius:6px;
  font-size:.85rem;
  font-family:monospace;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:.5rem;
  border:1px solid #e3ecf8;
  margin-bottom:.25rem;
  transition:background .12s;
}
.domain-item.avail{background:#f0fdf4;border-color:#86efac}
.domain-item.taken{background:#fef2f2;border-color:#fca5a5;opacity:.7}
.domain-item a{color:#1a3a5c;font-weight:600;text-decoration:none}
.domain-item a:hover{text-decoration:underline}
.domain-actions{display:flex;gap:.35rem;flex-shrink:0}

/* ══ CHECK ONE ════════════════════════════════════════════════════ */
.check-one-box{
  border-top:1px solid #e3ecf8;
  padding-top:.75rem;
  margin-top:.25rem;
  display:flex;
  flex-direction:column;
  gap:.5rem;
}
#checkOneInput{
  width:100%;
  padding:.42rem .6rem;
  border:1px solid #c8d5e8;
  border-radius:6px;
  font-size:.85rem;
  font-family:monospace;
}
#checkOneInput:focus{outline:2px solid #2563a8;outline-offset:1px}
.result-badge{
  padding:.35rem .75rem;
  border-radius:6px;
  font-size:.82rem;
  font-weight:700;
  text-align:center;
}
.badge-avail{background:#d4edda;color:#155724}
.badge-taken{background:#f8d7da;color:#721c24}
.badge-invalid{background:#fff3cd;color:#856404}
.badge-error{background:#f8d7da;color:#721c24}

/* ══ SCRATCHBOX ═══════════════════════════════════════════════════ */
.sb-btns{display:flex;gap:.4rem;flex-wrap:wrap}

/* ══ STATUS BADGES ════════════════════════════════════════════════ */
.tag{
  display:inline-block;
  font-size:.7rem;
  font-weight:700;
  padding:.1rem .45rem;
  border-radius:999px;
  text-transform:uppercase;
  letter-spacing:.04em;
}
.tag-avail{background:#d4edda;color:#155724}
.tag-taken{background:#f8d7da;color:#721c24}

/* ══ FOOTER ═══════════════════════════════════════════════════════ */
footer{
  background:#1a3a5c;
  color:rgba(255,255,255,.65);
  text-align:center;
  padding:.9rem 1rem;
  font-size:.8rem;
  margin-top:auto;
}
footer a{color:rgba(255,255,255,.8);text-decoration:none}
footer a:hover{color:#fff}

/* ══ RESPONSIVE ═══════════════════════════════════════════════════ */
@media(max-width:860px){
  .main-grid{grid-template-columns:1fr 30px 1fr;grid-template-rows:auto auto auto}
  #combine-panel{grid-column:1/-1;flex-direction:row;flex-wrap:wrap;padding-top:0;justify-content:center}
  #results-panel{grid-column:1/-1}
  #scratchbox-panel{grid-column:1/-1}
}
@media(max-width:560px){
  .main-grid{grid-template-columns:1fr}
  .plus-cell{display:none}
  #combine-panel{flex-direction:column}
}
</style>
</head>
<body>

<!-- ══ HEADER ══════════════════════════════════════════════════════ -->
<div id="header">
  <div id="navhdr">
    <div id="logo"><a href="<?= htmlspecialchars($baseUrl ?: '/') ?>">Dot-o-mator</a> <sup>®</sup></div>
    <nav>
      <a href="#" class="active">Home</a>
      <a href="#tips">Naming Tips</a>
      <a href="#about">About</a>
    </nav>
  </div>
</div>

<!-- ══ INTRO ════════════════════════════════════════════════════════ -->
<p class="intro">
  Use <strong>Dot-o-mator</strong> to create domain name suggestions.
  Enter words in the <strong>Beginnings</strong> box, choose some <strong>Endings</strong>,
  then click <strong>Combine</strong> to generate and check domain availability.
  Save favourites to your <strong>Scratchbox</strong> and check them any time.
</p>

<!-- ══ MAIN GRID ════════════════════════════════════════════════════ -->
<div class="main-grid">

  <!-- BEGINNINGS -->
  <div class="panel" id="beginnings-panel">
    <h4>Beginnings</h4>
    <select id="beginningsSelect">
      <?= $bOptions ?>
    </select>
    <label class="small">Or type your own words (one per line):</label>
    <textarea id="beginningsWords" placeholder="Enter words&#10;one per line&#10;e.g. Smart&#10;Cloud&#10;Fast" spellcheck="false"></textarea>
  </div>

  <!-- PLUS -->
  <div class="plus-cell">+</div>

  <!-- ENDINGS -->
  <div class="panel" id="endings-panel">
    <h4>Endings</h4>
    <select id="endingsSelect">
      <?= $eOptions ?>
    </select>
    <label class="small">Or type your own words (one per line):</label>
    <textarea id="endingsWords" placeholder="Enter words&#10;one per line&#10;e.g. Hub&#10;Lab&#10;Pro" spellcheck="false"></textarea>
  </div>

  <!-- COMBINE + STATUS -->
  <div class="panel" id="combine-panel-wrap">
    <h4>Combine</h4>
    <div id="combine-panel">
      <button class="btn btn-primary" id="combineBtn" disabled onclick="doCombine()">⚙ Combine &amp; Check</button>
      <div class="spinner" id="spinner"></div>
      <div id="status-msg"></div>
      <div id="progress"></div>
    </div>
  </div>

  <!-- RESULTS -->
  <div class="panel" id="results-panel">
    <div class="results-header" id="results-header">Results</div>
    <div id="available-section" style="display:none">
      <div style="font-weight:700;font-size:.85rem;color:#155724;margin-bottom:.35rem">
        ✓ Available <span class="avail-count" id="availCount">0</span>
      </div>
      <div id="availList"></div>
    </div>
    <div id="taken-section" style="display:none;margin-top:.5rem">
      <div style="font-weight:700;font-size:.85rem;color:#721c24;margin-bottom:.35rem">
        ✗ Taken <span class="taken-count" id="takenCount">0</span>
        <a href="#" onclick="toggleTaken();return false;" id="toggleTakenLink" style="font-size:.75rem;margin-left:.4rem">[show]</a>
      </div>
      <div id="takenList" style="display:none"></div>
    </div>
    <div id="no-results" style="font-size:.85rem;color:#888;padding:.5rem 0">
      Results will appear here after combining.
    </div>
  </div>

  <!-- SCRATCHBOX -->
  <div class="panel" id="scratchbox-panel">
    <h4>🗒 Scratchbox</h4>
    <div class="sb-btns">
      <button class="btn btn-secondary btn-small" id="checkSbBtn" <?= $sbDisabled ?> onclick="checkScratchbox()">Check All</button>
      <button class="btn btn-danger btn-small" id="clearSbBtn" <?= $sbDisabled ?> onclick="clearScratchbox()">Clear</button>
    </div>
    <textarea id="scratchboxWords" placeholder="Saved domains appear here&#10;(one per line)" spellcheck="false" rows="8"><?= htmlspecialchars($sbValue) ?></textarea>
    <div id="sb-results"></div>

    <!-- CHECK ONE -->
    <div class="check-one-box">
      <h4 style="border:none;padding:0;margin-bottom:.1rem">Check One Domain</h4>
      <input type="text" id="checkOneInput" placeholder="e.g. mybrand.com" spellcheck="false" />
      <button class="btn btn-secondary btn-small" id="checkOneBtn" onclick="checkOneDomain()">Check Availability</button>
      <div class="spinner" id="checkOneSpinner" style="margin:0 auto"></div>
      <div id="checkOneResult"></div>
    </div>
  </div>

</div><!-- /main-grid -->

<!-- ══ FOOTER ═══════════════════════════════════════════════════════ -->
<footer>
  Copyright &copy; 2007&ndash;<?= date('Y') ?> — Dot-o-mator PHP Clone.
  Inspired by <a href="https://www.dotomator.com" target="_blank" rel="noopener">dotomator.com</a>
  by Lightsphere LLC.
</footer>

<!-- ══ JAVASCRIPT ════════════════════════════════════════════════════ -->
<script>
const BASE = <?= json_encode($baseUrl) ?>;

// ── Category loader ───────────────────────────────────────────────
document.getElementById('beginningsSelect').addEventListener('change', function() {
  if (!this.value) { document.getElementById('beginningsWords').value = ''; showCombineBtn(); return; }
  loadCategory('beginnings', this.value, 'beginningsWords');
});
document.getElementById('endingsSelect').addEventListener('change', function() {
  if (!this.value) { document.getElementById('endingsWords').value = ''; showCombineBtn(); return; }
  loadCategory('endings', this.value, 'endingsWords');
});

async function loadCategory(type, name, targetId) {
  try {
    const res  = await fetch(`${BASE}/api/words?type=${encodeURIComponent(type)}&name=${encodeURIComponent(name)}`);
    const data = await res.json();
    document.getElementById(targetId).value = data.words.join('\n');
    showCombineBtn();
  } catch(e) {
    setStatus('Failed to load category. Please try again.');
  }
}

// ── Textarea listeners ────────────────────────────────────────────
['beginningsWords','endingsWords'].forEach(id => {
  document.getElementById(id).addEventListener('input', showCombineBtn);
});
document.getElementById('scratchboxWords').addEventListener('input', updateSbBtns);
document.getElementById('checkOneInput').addEventListener('keyup', function(e) {
  if (e.key === 'Enter') checkOneDomain();
});

// ── Enable/disable Combine button ─────────────────────────────────
function showCombineBtn() {
  const bVal = document.getElementById('beginningsWords').value.trim();
  const eVal = document.getElementById('endingsWords').value.trim();
  document.getElementById('combineBtn').disabled = !(bVal && eVal);
}

// ── COMBINE ───────────────────────────────────────────────────────
async function doCombine() {
  const bRaw = document.getElementById('beginningsWords').value.trim();
  const eRaw = document.getElementById('endingsWords').value.trim();
  if (!bRaw || !eRaw) return;

  const beginnings = bRaw.split('\n').map(s => s.trim()).filter(Boolean);
  const endings    = eRaw.split('\n').map(s => s.trim()).filter(Boolean);
  const total      = beginnings.length * endings.length;

  if (total > 200) {
    setStatus(`⚠ Too many combinations (${total}). Please reduce to under 200.`);
    return;
  }

  showSpinner(true);
  document.getElementById('combineBtn').disabled = true;
  setStatus(`Checking ${total} domain${total>1?'s':''}…`);
  document.getElementById('available-section').style.display = 'none';
  document.getElementById('taken-section').style.display     = 'none';
  document.getElementById('no-results').style.display        = 'none';
  document.getElementById('availList').innerHTML = '';
  document.getElementById('takenList').innerHTML = '';

  try {
    const body = new URLSearchParams({ beginnings: beginnings.join(','), endings: endings.join(',') });
    const res  = await fetch(`${BASE}/api/combine`, { method: 'POST', body });
    const data = await res.json();

    showSpinner(false);
    document.getElementById('combineBtn').disabled = false;

    if (data.status !== 'ok') {
      setStatus('Error: ' + (data.errmsg || 'Unknown error'));
      return;
    }

    const available = data.available ? data.available.split(',').filter(Boolean) : [];
    const taken     = data.taken     ? data.taken.split(',').filter(Boolean)     : [];

    if (available.length) {
      document.getElementById('availCount').textContent = available.length;
      document.getElementById('availList').innerHTML = available.map(domainCard).join('');
      document.getElementById('available-section').style.display = 'block';
    }
    if (taken.length) {
      document.getElementById('takenCount').textContent = taken.length;
      document.getElementById('takenList').innerHTML = taken.map(d =>
        `<div class="domain-item taken"><span>${d}</span><span class="tag tag-taken">taken</span></div>`
      ).join('');
      document.getElementById('taken-section').style.display = 'block';
    }
    if (!available.length && !taken.length) {
      document.getElementById('no-results').textContent = 'No results returned. Check your input.';
      document.getElementById('no-results').style.display = 'block';
    }
    setStatus(`Done! ${available.length} available, ${taken.length} taken.`);

  } catch(e) {
    showSpinner(false);
    document.getElementById('combineBtn').disabled = false;
    setStatus('Network error. Please try again.');
  }
}

function domainCard(domain) {
  const esc = domain.replace(/'/g, "\\'");
  return `<div class="domain-item avail">
    <a href="https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domain)}" target="_blank" rel="noopener">${domain}</a>
    <div class="domain-actions">
      <button class="btn btn-secondary btn-small" onclick="addToScratchbox('${esc}')">+ Save</button>
    </div>
  </div>`;
}

let takenVisible = false;
function toggleTaken() {
  takenVisible = !takenVisible;
  document.getElementById('takenList').style.display = takenVisible ? 'block' : 'none';
  document.getElementById('toggleTakenLink').textContent = takenVisible ? '[hide]' : '[show]';
}

// ── CHECK ONE ─────────────────────────────────────────────────────
async function checkOneDomain() {
  const name = document.getElementById('checkOneInput').value.trim();
  if (!name) return;
  document.getElementById('checkOneResult').innerHTML = '';
  document.getElementById('checkOneSpinner').style.display = 'block';
  document.getElementById('checkOneBtn').disabled = true;
  try {
    const res  = await fetch(`${BASE}/api/checkone?name=${encodeURIComponent(name)}`);
    const data = await res.json();
    document.getElementById('checkOneSpinner').style.display = 'none';
    document.getElementById('checkOneBtn').disabled = false;
    const badges = {
      available: `<div class="result-badge badge-avail">✓ Available — <a href="https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(name)}" target="_blank">Register at Namecheap</a></div>`,
      taken:     `<div class="result-badge badge-taken">✗ Taken</div>`,
      invalid:   `<div class="result-badge badge-invalid">⚠ Invalid domain format</div>`,
      error:     `<div class="result-badge badge-error">⚠ Error checking domain</div>`,
    };
    document.getElementById('checkOneResult').innerHTML = badges[data.result] || badges.error;
  } catch(e) {
    document.getElementById('checkOneSpinner').style.display = 'none';
    document.getElementById('checkOneBtn').disabled = false;
    document.getElementById('checkOneResult').innerHTML = '<div class="result-badge badge-error">Network error</div>';
  }
}

// ── SCRATCHBOX ────────────────────────────────────────────────────
async function addToScratchbox(domain) {
  try {
    const body = new URLSearchParams({ domain });
    const res  = await fetch(`${BASE}/scratchbox/add`, { method: 'POST', body });
    const data = await res.json();
    if (data.status === 'ok') {
      document.getElementById('scratchboxWords').value = data.scratchbox.join('\n');
      updateSbBtns();
    }
  } catch(e) { console.error('Scratchbox add failed', e); }
}

async function clearScratchbox() {
  if (!confirm('Clear all saved domains?')) return;
  try {
    await fetch(`${BASE}/scratchbox/clear`, { method: 'POST' });
    document.getElementById('scratchboxWords').value = '';
    document.getElementById('sb-results').innerHTML  = '';
    updateSbBtns();
  } catch(e) { console.error('Scratchbox clear failed', e); }
}

async function checkScratchbox() {
  const words = document.getElementById('scratchboxWords').value
    .split('\n').map(s => s.trim()).filter(Boolean);
  if (!words.length) return;

  // Sync session first
  const syncBody = new URLSearchParams();
  words.forEach(w => syncBody.append('domain', w));

  document.getElementById('sb-results').innerHTML = '<div style="font-size:.8rem;color:#666">Checking…</div>';
  document.getElementById('checkSbBtn').disabled  = true;

  try {
    const res  = await fetch(`${BASE}/scratchbox/check`, { method: 'POST' });
    const data = await res.json();
    if (data.status === 'ok') {
      let html = '<div style="margin-top:.5rem">';
      for (const [domain, result] of Object.entries(data.results)) {
        const cls  = result === 'available' ? 'avail' : result === 'taken' ? 'taken' : 'avail';
        const tag  = result === 'available' ? 'tag-avail' : 'tag-taken';
        const label = result.charAt(0).toUpperCase() + result.slice(1);
        html += `<div class="domain-item ${cls}">
          <span style="font-family:monospace">${domain}</span>
          <span class="tag ${tag}">${label}</span>
        </div>`;
      }
      html += '</div>';
      document.getElementById('sb-results').innerHTML = html;
    }
  } catch(e) {
    document.getElementById('sb-results').innerHTML = '<div style="color:#dc3545;font-size:.82rem">Error checking domains.</div>';
  } finally {
    document.getElementById('checkSbBtn').disabled = false;
  }
}

function updateSbBtns() {
  const val = document.getElementById('scratchboxWords').value.trim();
  document.getElementById('checkSbBtn').disabled = !val;
  document.getElementById('clearSbBtn').disabled = !val;
}

// ── UTILS ─────────────────────────────────────────────────────────
function showSpinner(show) {
  document.getElementById('spinner').style.display = show ? 'block' : 'none';
}
function setStatus(msg) {
  document.getElementById('status-msg').textContent = msg;
}
</script>
</body>
</html>
