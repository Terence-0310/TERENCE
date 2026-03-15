<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Nền tảng xem phim trực tuyến hàng đầu Việt Nam - Phim HD, phim bộ, phim điện ảnh mới nhất">
    <title>@yield('title', 'CinéViet - Xem Phim Trực Tuyến')</title>

    <!-- Bootstrap 5 CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
    <!-- Bootstrap Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">

    @yield('head_styles')

    <style>
        /* ============================================
           CINEVIET - GLOBAL DESIGN SYSTEM
           Dark Premium Vietnamese Streaming Platform
        ============================================ */

        :root {
            --cv-bg-dark:        #0a0a0f;
            --cv-bg-card:        #141420;
            --cv-bg-elevated:    #1a1a2a;
            --cv-bg-surface:     #1f1f30;
            --cv-border:         #2a2a3d;
            --cv-border-hover:   #3d3d5c;
            --cv-purple:         #7c3aed;
            --cv-purple-light:   #9d5cf0;
            --cv-purple-dim:     rgba(124, 58, 237, 0.18);
            --cv-accent:         #a855f7;
            --cv-text-primary:   #f0f0f8;
            --cv-text-secondary: #9999b8;
            --cv-text-muted:     #5a5a78;
            --cv-gold:           #f59e0b;
            --cv-green:          #22c55e;
            --cv-red:            #ef4444;
            --cv-blue:           #3b82f6;
            --cv-header-h:       64px;
        }

        *, *::before, *::after { box-sizing: border-box; }

        html { scroll-behavior: smooth; }

        body {
            background-color: var(--cv-bg-dark);
            color: var(--cv-text-primary);
            font-family: 'Be Vietnam Pro', 'Segoe UI', sans-serif;
            font-size: 14px;
            line-height: 1.5;
            min-height: 100vh;
            overflow-x: hidden;
        }

        /* ---- Scrollbar ---- */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: var(--cv-bg-dark); }
        ::-webkit-scrollbar-thumb { background: var(--cv-border); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--cv-purple); }

        /* ---- Typography ---- */
        h1, h2, h3, h4, h5, h6 { color: var(--cv-text-primary); font-weight: 700; }
        a { color: var(--cv-text-primary); text-decoration: none; transition: color .2s; }
        a:hover { color: var(--cv-accent); }

        /* ---- Badges ---- */
        .badge-age {
            display: inline-flex; align-items: center; justify-content: center;
            background: var(--cv-red); color: #fff;
            font-size: 10px; font-weight: 700; letter-spacing: .5px;
            padding: 2px 6px; border-radius: 3px; text-transform: uppercase;
        }
        .badge-age.t13 { background: #f59e0b; }
        .badge-age.t16 { background: #ef4444; }
        .badge-age.t18 { background: #7f1d1d; }
        .badge-age.p   { background: #166534; }

        .badge-access {
            display: inline-flex; align-items: center;
            font-size: 10px; font-weight: 700; letter-spacing: .5px;
            padding: 2px 7px; border-radius: 3px; text-transform: uppercase;
        }
        .badge-access.premium  { background: var(--cv-purple); color: #fff; }
        .badge-access.rental   { background: var(--cv-gold); color: #000; }
        .badge-access.free     { background: var(--cv-green); color: #000; }

        .badge-quality {
            display: inline-flex; align-items: center;
            background: rgba(59, 130, 246, 0.2); color: var(--cv-blue);
            border: 1px solid rgba(59, 130, 246, 0.4);
            font-size: 10px; font-weight: 700;
            padding: 2px 6px; border-radius: 3px;
        }

        /* ---- Buttons ---- */
        .btn-cv-primary {
            background: var(--cv-purple); color: #fff; border: none;
            padding: 9px 22px; border-radius: 6px; font-weight: 600; font-size: 14px;
            transition: background .2s, transform .15s; cursor: pointer;
            display: inline-flex; align-items: center; gap: 7px;
        }
        .btn-cv-primary:hover { background: var(--cv-purple-light); color: #fff; transform: translateY(-1px); }

        .btn-cv-outline {
            background: transparent; color: var(--cv-text-primary);
            border: 1.5px solid var(--cv-border); padding: 9px 22px;
            border-radius: 6px; font-weight: 600; font-size: 14px;
            transition: border-color .2s, color .2s, background .2s; cursor: pointer;
            display: inline-flex; align-items: center; gap: 7px;
        }
        .btn-cv-outline:hover { border-color: var(--cv-purple); color: var(--cv-accent); background: var(--cv-purple-dim); }

        .btn-cv-ghost {
            background: rgba(255,255,255,.08); color: var(--cv-text-primary);
            border: none; padding: 9px 22px; border-radius: 6px;
            font-weight: 600; font-size: 14px;
            transition: background .2s; cursor: pointer;
            display: inline-flex; align-items: center; gap: 7px;
        }
        .btn-cv-ghost:hover { background: rgba(255,255,255,.14); color: #fff; }

        /* ---- Cards ---- */
        .cv-card {
            position: relative; background: var(--cv-bg-card);
            border-radius: 8px; overflow: hidden;
            border: 1px solid var(--cv-border);
            transition: transform .22s, border-color .22s, box-shadow .22s;
            cursor: pointer; flex-shrink: 0;
        }
        .cv-card:hover {
            transform: translateY(-4px) scale(1.025);
            border-color: var(--cv-border-hover);
            box-shadow: 0 12px 40px rgba(124, 58, 237, .22);
        }
        .cv-card-poster {
            width: 100%; aspect-ratio: 2/3;
            object-fit: cover; display: block;
            background: var(--cv-bg-elevated);
        }
        .cv-card-overlay {
            position: absolute; inset: 0;
            background: linear-gradient(to top, rgba(0,0,0,.85) 0%, transparent 55%);
            opacity: 0; transition: opacity .22s;
        }
        .cv-card:hover .cv-card-overlay { opacity: 1; }
        .cv-card-play {
            position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
            background: rgba(124,58,237,.85); color: #fff;
            width: 42px; height: 42px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 18px; opacity: 0; transition: opacity .22s;
        }
        .cv-card:hover .cv-card-play { opacity: 1; }
        .cv-card-body { padding: 8px 10px 10px; }
        .cv-card-title {
            font-size: 13px; font-weight: 600; color: var(--cv-text-primary);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            margin-bottom: 3px;
        }
        .cv-card-meta {
            font-size: 11px; color: var(--cv-text-muted);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cv-card-badges {
            position: absolute; top: 7px; left: 7px;
            display: flex; gap: 4px; flex-wrap: wrap;
        }
        .cv-card-badges-br {
            position: absolute; top: 7px; right: 7px;
        }

        /* ---- Shelf ---- */
        .cv-shelf { margin-bottom: 36px; }
        .cv-shelf-header {
            display: flex; align-items: center; justify-content: space-between;
            margin-bottom: 14px;
        }
        .cv-shelf-title {
            font-size: 18px; font-weight: 700; color: var(--cv-text-primary);
            display: flex; align-items: center; gap: 8px;
        }
        .cv-shelf-title::before {
            content: ''; display: block;
            width: 4px; height: 20px;
            background: var(--cv-purple); border-radius: 2px;
        }
        .cv-shelf-see-all {
            font-size: 12px; color: var(--cv-purple-light); font-weight: 600;
        }
        .cv-shelf-see-all:hover { color: var(--cv-accent); text-decoration: underline; }

        .cv-shelf-track-wrap {
            position: relative;
        }
        .cv-shelf-track {
            display: flex; gap: 12px;
            overflow-x: auto; padding-bottom: 6px;
            scroll-behavior: smooth;
            scrollbar-width: none;
        }
        .cv-shelf-track::-webkit-scrollbar { display: none; }
        .cv-shelf-track .cv-card { width: 140px; min-width: 140px; }

        .cv-shelf-btn {
            position: absolute; top: 50%; transform: translateY(-50%);
            background: rgba(20, 20, 32, .92); color: #fff;
            border: 1px solid var(--cv-border); width: 36px; height: 70px;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; z-index: 5; border-radius: 6px;
            transition: background .2s;
        }
        .cv-shelf-btn:hover { background: var(--cv-purple); border-color: var(--cv-purple); }
        .cv-shelf-btn.prev { left: -18px; }
        .cv-shelf-btn.next { right: -18px; }

        /* ---- Section separator ---- */
        .cv-section { padding: 32px 0; }

        /* ---- Overlay helpers ---- */
        .gradient-bottom {
            background: linear-gradient(to top, rgba(10,10,15,1) 0%, rgba(10,10,15,.6) 40%, transparent 100%);
        }
        .gradient-left {
            background: linear-gradient(to right, rgba(10,10,15,1) 0%, rgba(10,10,15,.7) 50%, transparent 100%);
        }

        /* ---- Utility ---- */
        .text-purple  { color: var(--cv-purple-light) !important; }
        .text-muted-cv { color: var(--cv-text-muted) !important; }
        .text-secondary-cv { color: var(--cv-text-secondary) !important; }
        .bg-surface   { background: var(--cv-bg-surface) !important; }
        .bg-elevated  { background: var(--cv-bg-elevated) !important; }
        .border-cv    { border-color: var(--cv-border) !important; }
        .rounded-cv   { border-radius: 8px !important; }

        /* ---- Divider ---- */
        hr.cv-divider { border-color: var(--cv-border); margin: 28px 0; opacity: 1; }

        @media (max-width: 767.98px) {
            .cv-shelf-btn { display: none; }
            .cv-shelf-track .cv-card { width: 120px; min-width: 120px; }
        }
    </style>
</head>
<body>

    {{-- ========================================================
         HEADER PARTIAL - included on every page
    ========================================================= --}}
    @include('partials.header')

    {{-- ========================================================
         MAIN CONTENT AREA
    ========================================================= --}}
    <main id="main-content">
        @yield('content')
    </main>

    {{-- ========================================================
         FOOTER PARTIAL - included on every page
    ========================================================= --}}
    @include('partials.footer')

    <!-- Bootstrap 5 JS Bundle (Popper included) -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>

    {{-- ========================================================
         SHARED VANILLA JS - shelf scroll, active states
    ========================================================= --}}
    <script>
    // ----- Shelf horizontal scroll controls -----
    document.querySelectorAll('.cv-shelf-track-wrap').forEach(wrap => {
        const track = wrap.querySelector('.cv-shelf-track');
        const prev  = wrap.querySelector('.cv-shelf-btn.prev');
        const next  = wrap.querySelector('.cv-shelf-btn.next');
        const step  = 480;
        if (prev) prev.addEventListener('click', () => { track.scrollLeft -= step; });
        if (next) next.addEventListener('click', () => { track.scrollLeft += step; });
    });

    // ----- Server tab active toggle -----
    document.querySelectorAll('.cv-server-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.cv-server-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // ----- Episode active toggle -----
    document.querySelectorAll('.cv-ep-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.cv-ep-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    </script>

    @yield('scripts')

</body>
</html>
