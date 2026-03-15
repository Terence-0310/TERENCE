{{-- ============================================================
     PARTIAL: partials/header.blade.php
     Sticky top navigation - shared across all pages
============================================================ --}}

<style>
    /* ---- Header ---- */
    .cv-header {
        position: sticky; top: 0; z-index: 1000;
        height: var(--cv-header-h);
        background: rgba(10, 10, 15, .96);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--cv-border);
        display: flex; align-items: center;
    }
    .cv-header-inner {
        display: flex; align-items: center; gap: 0;
        width: 100%; padding: 0 24px;
    }
    .cv-logo {
        display: flex; align-items: center; gap: 8px;
        font-size: 22px; font-weight: 900; color: #fff;
        letter-spacing: -.5px; text-decoration: none;
        flex-shrink: 0; margin-right: 32px;
        white-space: nowrap;
    }
    .cv-logo-icon {
        width: 32px; height: 32px; background: var(--cv-purple);
        border-radius: 8px; display: flex; align-items: center; justify-content: center;
        font-size: 16px; color: #fff;
    }
    .cv-logo span.accent { color: var(--cv-accent); }

    .cv-nav {
        display: flex; align-items: center; gap: 2px;
        list-style: none; margin: 0; padding: 0; flex: 1;
    }
    .cv-nav a {
        display: block; padding: 6px 11px;
        font-size: 13px; font-weight: 500;
        color: var(--cv-text-secondary); border-radius: 5px;
        white-space: nowrap; transition: color .18s, background .18s;
    }
    .cv-nav a:hover, .cv-nav a.active {
        color: var(--cv-text-primary); background: rgba(255,255,255,.06);
    }
    .cv-nav a.active { color: var(--cv-accent); font-weight: 600; }
    .cv-nav .nav-promo a { color: var(--cv-gold); }

    .cv-header-actions {
        display: flex; align-items: center; gap: 8px;
        flex-shrink: 0; margin-left: 12px;
    }
    .cv-header-icon-btn {
        background: transparent; border: none; color: var(--cv-text-secondary);
        width: 36px; height: 36px; border-radius: 7px;
        display: flex; align-items: center; justify-content: center;
        font-size: 17px; cursor: pointer;
        transition: color .18s, background .18s;
    }
    .cv-header-icon-btn:hover { color: #fff; background: rgba(255,255,255,.08); }

    .cv-search-bar {
        display: flex; align-items: center; gap: 8px;
        background: var(--cv-bg-surface); border: 1px solid var(--cv-border);
        border-radius: 7px; padding: 5px 12px;
        width: 220px; transition: border-color .2s, width .3s;
    }
    .cv-search-bar:focus-within { border-color: var(--cv-purple); width: 280px; }
    .cv-search-bar input {
        background: transparent; border: none; outline: none;
        color: var(--cv-text-primary); font-size: 13px;
        width: 100%; font-family: inherit;
    }
    .cv-search-bar input::placeholder { color: var(--cv-text-muted); }
    .cv-search-bar .bi { color: var(--cv-text-muted); font-size: 15px; }

    .cv-btn-login {
        background: var(--cv-purple); color: #fff;
        border: none; padding: 6px 16px; border-radius: 6px;
        font-size: 13px; font-weight: 600; cursor: pointer;
        transition: background .2s; white-space: nowrap;
    }
    .cv-btn-login:hover { background: var(--cv-purple-light); }

    .cv-btn-register {
        background: transparent; color: var(--cv-text-primary);
        border: 1.5px solid var(--cv-border); padding: 5px 14px;
        border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;
        transition: border-color .2s, color .2s; white-space: nowrap;
    }
    .cv-btn-register:hover { border-color: var(--cv-purple); color: var(--cv-accent); }

    /* Mobile hamburger */
    .cv-mobile-toggle {
        display: none; background: transparent; border: none;
        color: var(--cv-text-primary); font-size: 22px; cursor: pointer;
        margin-left: auto;
    }

    @media (max-width: 1199.98px) {
        .cv-nav a { padding: 6px 8px; font-size: 12px; }
        .cv-search-bar { width: 160px; }
        .cv-search-bar:focus-within { width: 200px; }
    }
    @media (max-width: 991.98px) {
        .cv-nav { display: none; }
        .cv-mobile-toggle { display: flex; align-items: center; }
        .cv-search-bar { display: none; }
        .cv-header-actions .cv-header-icon-btn.search-toggle { display: flex; }
    }
    @media (max-width: 575.98px) {
        .cv-header-inner { padding: 0 14px; }
        .cv-btn-register { display: none; }
    }

    /* Mobile nav drawer */
    .cv-mobile-nav {
        display: none; position: fixed; top: var(--cv-header-h); left: 0; right: 0; bottom: 0;
        background: rgba(10,10,15,.98); backdrop-filter: blur(16px);
        z-index: 999; padding: 20px; overflow-y: auto;
    }
    .cv-mobile-nav.open { display: block; }
    .cv-mobile-nav ul { list-style: none; margin: 0; padding: 0; }
    .cv-mobile-nav ul li a {
        display: block; padding: 12px 16px; font-size: 15px; font-weight: 500;
        color: var(--cv-text-secondary); border-bottom: 1px solid var(--cv-border);
        border-radius: 6px; margin-bottom: 2px;
    }
    .cv-mobile-nav ul li a:hover { color: #fff; background: rgba(255,255,255,.05); }
    .cv-mobile-nav-actions {
        display: flex; gap: 10px; margin-top: 20px;
    }
    .cv-mobile-search {
        display: flex; align-items: center; gap: 8px;
        background: var(--cv-bg-surface); border: 1px solid var(--cv-border);
        border-radius: 8px; padding: 8px 14px; margin-bottom: 16px;
    }
    .cv-mobile-search input {
        background: transparent; border: none; outline: none;
        color: var(--cv-text-primary); font-size: 14px; width: 100%;
        font-family: inherit;
    }
    .cv-mobile-search input::placeholder { color: var(--cv-text-muted); }
</style>

<!-- Header -->
<header class="cv-header" role="banner">
    <div class="cv-header-inner">

        {{-- Logo --}}
        <a href="{{ url('/') }}" class="cv-logo" aria-label="CinéViet - Trang chủ">
            <div class="cv-logo-icon"><i class="bi bi-play-fill"></i></div>
            Ciné<span class="accent">Viet</span>
        </a>

        {{-- Desktop Navigation --}}
        <nav aria-label="Navigation chính">
            <ul class="cv-nav">
                <li><a href="{{ url('/') }}" class="{{ request()->is('/') ? 'active' : '' }}">Trang chủ</a></li>
                <li><a href="{{ url('/browse') }}" class="{{ request()->is('browse*') ? 'active' : '' }}">Kho phim</a></li>
                <li><a href="{{ url('/phim-dien-anh') }}" class="{{ request()->is('phim-dien-anh*') ? 'active' : '' }}">Phim điện ảnh</a></li>
                <li><a href="{{ url('/phim-bo') }}" class="{{ request()->is('phim-bo*') ? 'active' : '' }}">Phim bộ</a></li>
                <li><a href="{{ url('/phim-thue') }}" class="{{ request()->is('phim-thue*') ? 'active' : '' }}">Phim thuê</a></li>
                <li><a href="{{ url('/mien-phi') }}" class="{{ request()->is('mien-phi*') ? 'active' : '' }}">Phim không mất phí</a></li>
                <li class="nav-promo"><a href="{{ url('/khuyen-mai') }}">Khuyến mãi</a></li>
                <li><a href="{{ url('/blog') }}">Blog</a></li>
                <li><a href="{{ url('/ho-tro') }}">Hỗ trợ</a></li>
            </ul>
        </nav>

        {{-- Header Actions --}}
        <div class="cv-header-actions">

            {{-- Search Bar (desktop) --}}
            <form action="{{ url('/search') }}" method="GET" class="cv-search-bar" role="search">
                <i class="bi bi-search"></i>
                <input type="search" name="q" placeholder="Tìm phim, diễn viên..." aria-label="Tìm kiếm phim">
            </form>

            {{-- Notification icon (logged-in placeholder) --}}
            <button class="cv-header-icon-btn" aria-label="Thông báo" title="Thông báo">
                <i class="bi bi-bell"></i>
            </button>

            {{-- Auth Buttons --}}
            <button class="cv-btn-register" onclick="window.location='{{ url('/register') }}'">Đăng ký</button>
            <button class="cv-btn-login"    onclick="window.location='{{ url('/login') }}'">Đăng nhập</button>

            {{-- Mobile Toggle --}}
            <button class="cv-mobile-toggle" id="cvMobileToggle" aria-label="Mở menu" aria-expanded="false">
                <i class="bi bi-list" id="cvMobileIcon"></i>
            </button>
        </div>

    </div>
</header>

{{-- Mobile Drawer --}}
<nav class="cv-mobile-nav" id="cvMobileNav" aria-label="Navigation mobile">
    <div class="cv-mobile-search">
        <i class="bi bi-search" style="color:var(--cv-text-muted)"></i>
        <input type="search" placeholder="Tìm phim, diễn viên...">
    </div>
    <ul>
        <li><a href="{{ url('/') }}">Trang chủ</a></li>
        <li><a href="{{ url('/browse') }}">Kho phim</a></li>
        <li><a href="{{ url('/phim-dien-anh') }}">Phim điện ảnh</a></li>
        <li><a href="{{ url('/phim-bo') }}">Phim bộ</a></li>
        <li><a href="{{ url('/phim-thue') }}">Phim thuê</a></li>
        <li><a href="{{ url('/mien-phi') }}">Phim không mất phí</a></li>
        <li><a href="{{ url('/khuyen-mai') }}" style="color:var(--cv-gold)">Khuyến mãi</a></li>
        <li><a href="{{ url('/blog') }}">Blog</a></li>
        <li><a href="{{ url('/ho-tro') }}">Hỗ trợ</a></li>
    </ul>
    <div class="cv-mobile-nav-actions">
        <button class="cv-btn-register" style="flex:1" onclick="window.location='{{ url('/register') }}'">Đăng ký</button>
        <button class="cv-btn-login"    style="flex:1" onclick="window.location='{{ url('/login') }}'">Đăng nhập</button>
    </div>
</nav>

<script>
(function(){
    var toggle = document.getElementById('cvMobileToggle');
    var drawer = document.getElementById('cvMobileNav');
    var icon   = document.getElementById('cvMobileIcon');
    if(!toggle) return;
    toggle.addEventListener('click', function(){
        var open = drawer.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open);
        icon.className = open ? 'bi bi-x-lg' : 'bi bi-list';
        document.body.style.overflow = open ? 'hidden' : '';
    });
})();
</script>
