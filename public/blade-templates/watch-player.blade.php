{{-- ============================================================
     VIEW: resources/views/watch-player.blade.php
     Route: /watch/{slug}
     Layout: layouts.app
     NOTE: This page uses a compact header override.
           Override @section('content') wraps everything in a
           near-full-screen dark immersive layout.
============================================================ --}}

@extends('layouts.app')

@section('title', ($watch['episode_title'] ?? $watch['title'] ?? 'Đang phát') . ' - CinéViet')

@section('head_styles')
<style>
    /* ============================================
       WATCH PLAYER PAGE STYLES
    ============================================ */

    /* ---- Compact header override for player page ---- */
    .cv-header {
        height: 52px !important;
        background: rgba(5, 5, 10, .98) !important;
    }
    .cv-nav { display: none !important; }
    .cv-search-bar { display: none !important; }
    .cv-btn-register { display: none !important; }
    .cv-mobile-toggle { display: none !important; }

    .cv-player-back-btn {
        display: inline-flex; align-items: center; gap: 6px;
        color: var(--cv-text-secondary); font-size: 13px; font-weight: 500;
        background: transparent; border: none; cursor: pointer;
        transition: color .18s; padding: 0; margin-right: 16px;
    }
    .cv-player-back-btn:hover { color: #fff; }
    .cv-player-back-btn i { font-size: 16px; }

    .cv-player-header-title {
        font-size: 14px; font-weight: 600; color: var(--cv-text-primary);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        max-width: 380px;
    }
    .cv-player-header-ep {
        font-size: 12px; color: var(--cv-text-muted); margin-left: 8px;
        white-space: nowrap;
    }

    /* ---- Player wrapper ---- */
    .cv-player-page {
        background: var(--cv-bg-dark);
        min-height: calc(100vh - 52px);
    }

    /* ---- Main Player Area ---- */
    .cv-player-main {
        background: #000; width: 100%; position: relative;
        aspect-ratio: 16/9; max-height: 76vh;
        overflow: hidden; border-bottom: 1px solid var(--cv-border);
    }
    .cv-player-bg-poster {
        position: absolute; inset: 0; width: 100%; height: 100%;
        object-fit: cover; opacity: .25; filter: blur(2px);
    }
    .cv-player-overlay {
        position: absolute; inset: 0;
        background: rgba(0,0,0,.55);
        display: flex; align-items: center; justify-content: center;
    }

    /* Play button */
    .cv-player-play-btn {
        width: 72px; height: 72px; border-radius: 50%;
        background: rgba(124, 58, 237, .9);
        border: 3px solid rgba(255,255,255,.3);
        display: flex; align-items: center; justify-content: center;
        font-size: 30px; color: #fff; cursor: pointer;
        transition: background .2s, transform .15s;
        box-shadow: 0 0 40px rgba(124,58,237,.5);
    }
    .cv-player-play-btn:hover { background: var(--cv-purple-light); transform: scale(1.06); }

    /* Progress bar mockup */
    .cv-player-controls {
        position: absolute; bottom: 0; left: 0; right: 0;
        padding: 0 18px 14px;
        background: linear-gradient(to top, rgba(0,0,0,.9) 0%, transparent 100%);
    }
    .cv-player-progress {
        width: 100%; height: 4px; background: rgba(255,255,255,.2);
        border-radius: 2px; margin-bottom: 12px; cursor: pointer; position: relative;
    }
    .cv-player-progress-fill {
        height: 100%; border-radius: 2px;
        background: var(--cv-purple);
        width: 34%;
        position: relative;
    }
    .cv-player-progress-fill::after {
        content: ''; position: absolute; right: -5px; top: -4px;
        width: 12px; height: 12px; border-radius: 50%;
        background: #fff; box-shadow: 0 0 6px rgba(124,58,237,.6);
    }
    .cv-player-controls-row {
        display: flex; align-items: center; gap: 10px;
    }
    .cv-player-ctrl-btn {
        background: transparent; border: none; color: rgba(255,255,255,.8);
        font-size: 18px; cursor: pointer; padding: 4px 5px;
        transition: color .18s;
        display: flex; align-items: center;
    }
    .cv-player-ctrl-btn:hover { color: #fff; }
    .cv-player-ctrl-btn.sm { font-size: 16px; }
    .cv-player-time {
        font-size: 12px; color: rgba(255,255,255,.75);
        font-variant-numeric: tabular-nums; white-space: nowrap;
    }
    .cv-player-quality-badge {
        background: rgba(255,255,255,.12); color: #fff;
        border: 1px solid rgba(255,255,255,.2); border-radius: 4px;
        font-size: 10px; font-weight: 700; padding: 2px 7px; cursor: pointer;
        transition: background .18s;
    }
    .cv-player-quality-badge:hover { background: rgba(255,255,255,.22); }
    .cv-player-sub-badge {
        background: transparent; color: rgba(255,255,255,.75);
        border: 1px solid rgba(255,255,255,.2); border-radius: 4px;
        font-size: 10px; font-weight: 600; padding: 2px 7px; cursor: pointer;
        transition: background .18s; white-space: nowrap;
    }
    .cv-player-sub-badge:hover { background: rgba(255,255,255,.1); color: #fff; }

    .cv-player-spacer { margin-left: auto; }

    /* Autoplay toggle */
    .cv-autoplay-toggle {
        display: flex; align-items: center; gap: 5px;
        font-size: 11px; color: rgba(255,255,255,.65); cursor: pointer;
        white-space: nowrap;
    }
    .cv-autoplay-toggle input { cursor: pointer; accent-color: var(--cv-purple); }

    /* ---- Player body area ---- */
    .cv-player-body { padding: 20px 0 0; }

    /* ---- Player info block ---- */
    .cv-player-info-block {
        background: var(--cv-bg-card); border: 1px solid var(--cv-border);
        border-radius: 10px; padding: 18px 20px; margin-bottom: 16px;
    }
    .cv-player-movie-title {
        font-size: 18px; font-weight: 800; margin-bottom: 2px;
    }
    .cv-player-ep-title {
        font-size: 14px; color: var(--cv-text-secondary); margin-bottom: 12px;
    }
    .cv-player-meta-row {
        display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
        font-size: 12px; color: var(--cv-text-muted);
    }
    .cv-player-meta-row .dot { width: 3px; height: 3px; border-radius: 50%; background: var(--cv-text-muted); }

    /* ---- Server Tabs ---- */
    .cv-server-tabs {
        background: var(--cv-bg-card); border: 1px solid var(--cv-border);
        border-radius: 10px; padding: 16px 20px; margin-bottom: 16px;
    }
    .cv-server-tabs-title {
        font-size: 12px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase;
        color: var(--cv-text-muted); margin-bottom: 12px;
    }
    .cv-server-row {
        display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px;
    }
    .cv-server-btn {
        background: var(--cv-bg-surface); border: 1.5px solid var(--cv-border);
        color: var(--cv-text-secondary); padding: 6px 16px;
        border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;
        transition: background .18s, border-color .18s, color .18s;
    }
    .cv-server-btn:hover { border-color: var(--cv-border-hover); color: var(--cv-text-primary); }
    .cv-server-btn.active { background: var(--cv-purple-dim); border-color: var(--cv-purple); color: var(--cv-accent); }

    /* ---- Episode buttons (compact grid) ---- */
    .cv-ep-scroll {
        display: flex; gap: 6px; flex-wrap: wrap; max-height: 160px;
        overflow-y: auto; scrollbar-width: thin;
        scrollbar-color: var(--cv-border) transparent;
    }
    .cv-ep-btn {
        min-width: 42px; height: 34px; border-radius: 6px;
        background: var(--cv-bg-surface); border: 1.5px solid var(--cv-border);
        color: var(--cv-text-secondary); font-size: 13px; font-weight: 600;
        cursor: pointer; transition: border-color .18s, color .18s, background .18s;
        display: flex; align-items: center; justify-content: center;
        position: relative;
    }
    .cv-ep-btn:hover { border-color: var(--cv-border-hover); color: var(--cv-text-primary); }
    .cv-ep-btn.active { background: var(--cv-purple-dim); border-color: var(--cv-purple); color: var(--cv-accent); }
    .cv-ep-btn.locked { opacity: .45; cursor: default; }
    .cv-ep-btn.locked::after {
        content: '\F4C3';
        font-family: 'bootstrap-icons'; font-size: 8px;
        position: absolute; top: 3px; right: 4px; color: var(--cv-gold);
    }

    /* ---- Action buttons row ---- */
    .cv-player-actions {
        background: var(--cv-bg-card); border: 1px solid var(--cv-border);
        border-radius: 10px; padding: 14px 20px; margin-bottom: 16px;
        display: flex; gap: 8px; flex-wrap: wrap;
    }

    /* ---- Next ep card ---- */
    .cv-next-ep-card {
        background: var(--cv-bg-card); border: 1px solid var(--cv-border);
        border-radius: 10px; padding: 14px 16px;
        display: flex; gap: 14px; align-items: center;
        transition: border-color .2s; cursor: pointer; text-decoration: none;
    }
    .cv-next-ep-card:hover { border-color: var(--cv-purple); color: var(--cv-text-primary); }
    .cv-next-ep-thumb {
        width: 96px; height: 60px; border-radius: 7px;
        object-fit: cover; flex-shrink: 0; background: var(--cv-bg-elevated);
    }
    .cv-next-ep-label { font-size: 11px; color: var(--cv-text-muted); margin-bottom: 3px; }
    .cv-next-ep-title { font-size: 13px; font-weight: 600; color: var(--cv-text-primary); }
    .cv-next-ep-meta  { font-size: 11px; color: var(--cv-text-muted); margin-top: 2px; }

    @media (max-width: 991.98px) {
        .cv-player-main { aspect-ratio: 16/9; max-height: none; }
    }
    @media (max-width: 575.98px) {
        .cv-player-header-title { max-width: 180px; font-size: 13px; }
        .cv-player-info-block  { padding: 14px 14px; }
        .cv-player-actions     { padding: 12px 14px; }
    }
</style>
@endsection

@section('content')

{{-- ============================================================
     Player Header Strip (overrides default header area)
     Injected right below the sticky header via JS
============================================================ --}}

{{-- Compact breadcrumb bar below header --}}
<div style="background:rgba(5,5,10,.95);border-bottom:1px solid var(--cv-border);padding:8px 20px;display:flex;align-items:center;gap:12px">
    <a href="{{ url('/movie/'.($watch['slug'] ?? 'trieu-dai-bong-toi')) }}" class="cv-player-back-btn" aria-label="Quay lại chi tiết phim">
        <i class="bi bi-arrow-left"></i> Chi tiết phim
    </a>
    <div style="width:1px;height:16px;background:var(--cv-border)"></div>
    <span style="font-size:12px;color:var(--cv-text-muted)">
        <a href="{{ url('/') }}" style="color:var(--cv-text-muted)">Trang chủ</a>
        <i class="bi bi-chevron-right" style="font-size:10px;margin:0 4px"></i>
        <a href="{{ url('/phim-bo') }}" style="color:var(--cv-text-muted)">Phim bộ</a>
        <i class="bi bi-chevron-right" style="font-size:10px;margin:0 4px"></i>
        <a href="{{ url('/movie/'.($watch['slug'] ?? 'trieu-dai-bong-toi')) }}" style="color:var(--cv-text-muted)">Triều Đại Bóng Tối</a>
        <i class="bi bi-chevron-right" style="font-size:10px;margin:0 4px"></i>
        <span style="color:var(--cv-text-secondary)">Tập 1</span>
    </span>
</div>

{{-- Placeholder watch data --}}
@php
$watch = $watch ?? [
    'title'         => 'Triều Đại Bóng Tối',
    'slug'          => 'trieu-dai-bong-toi',
    'episode_title' => 'Tập 1: Bình minh cuối cùng',
    'episode_num'   => 1,
    'season_num'    => 1,
    'total_eps'     => 32,
    'age_rating'    => 'T18',
    'access_type'   => 'premium',
    'quality'       => '4K HDR',
    'genre'         => 'Cổ trang · Lịch sử',
    'year'          => 2024,
    'duration'      => '45 phút',
    'synopsis'      => 'Hoàng tử Minh Anh nhận lệnh xử tử bất ngờ từ phụ hoàng. Trên đường bị áp giải ra pháp trường, một biến cố chấn động thay đổi tất cả.',
    'backdrop'      => 'https://picsum.photos/seed/player-bg/1920/1080',
    'current_server'=> 'Vietsub',
    'subtitle'      => 'Phụ đề Vietsub',
    'servers'       => ['Server 1','Server 2','Vietsub','Thuyết minh'],
];
@endphp

<div class="cv-player-page">

    {{-- ============================================================
         Main Player
    ============================================================ --}}
    <div class="cv-player-main" aria-label="Trình phát video: {{ $watch['title'] }} - {{ $watch['episode_title'] }}">
        <img src="{{ $watch['backdrop'] }}" alt="Nền phim {{ $watch['title'] }}" class="cv-player-bg-poster">

        <div class="cv-player-overlay">
            <button class="cv-player-play-btn" aria-label="Phát video">
                <i class="bi bi-play-fill" style="margin-left:3px"></i>
            </button>
        </div>

        {{-- Player Controls --}}
        <div class="cv-player-controls">

            {{-- Progress bar --}}
            <div class="cv-player-progress" role="slider" aria-label="Thanh tiến trình video" aria-valuemin="0" aria-valuemax="100" aria-valuenow="34">
                <div class="cv-player-progress-fill"></div>
            </div>

            {{-- Controls row --}}
            <div class="cv-player-controls-row">
                <button class="cv-player-ctrl-btn" aria-label="Phát/Dừng">
                    <i class="bi bi-play-fill"></i>
                </button>
                <button class="cv-player-ctrl-btn sm" aria-label="Tua lùi 10 giây">
                    <i class="bi bi-skip-backward-fill"></i>
                </button>
                <button class="cv-player-ctrl-btn sm" aria-label="Tập tiếp theo">
                    <i class="bi bi-skip-forward-fill"></i>
                </button>
                <button class="cv-player-ctrl-btn sm" aria-label="Âm lượng">
                    <i class="bi bi-volume-up-fill"></i>
                </button>
                <input type="range" min="0" max="100" value="80"
                       style="width:80px;accent-color:var(--cv-purple);cursor:pointer"
                       aria-label="Thanh âm lượng">
                <span class="cv-player-time">15:23 / 44:52</span>

                <div class="cv-player-spacer"></div>

                <label class="cv-autoplay-toggle">
                    <input type="checkbox" checked aria-label="Tự động phát tập tiếp"> Tự động
                </label>

                <button class="cv-player-sub-badge" aria-label="Phụ đề">
                    <i class="bi bi-closed-caption me-1"></i>{{ $watch['subtitle'] }}
                </button>

                <span class="cv-player-quality-badge" title="Chất lượng video">{{ $watch['quality'] }}</span>

                <button class="cv-player-ctrl-btn sm" aria-label="Cài đặt">
                    <i class="bi bi-gear"></i>
                </button>
                <button class="cv-player-ctrl-btn sm" aria-label="Toàn màn hình">
                    <i class="bi bi-fullscreen"></i>
                </button>
            </div>

        </div>
    </div>
    {{-- /Main Player --}}


    {{-- ============================================================
         Player Body
    ============================================================ --}}
    <div class="cv-player-body">
        <div class="container-fluid px-3 px-lg-4">
            <div class="row g-4">

                {{-- Left / Main Column --}}
                <div class="col-lg-8 col-xl-9">

                    {{-- Player Info Block --}}
                    {{-- Player Info --}}
                    <div class="cv-player-info-block">
                        <div class="d-flex align-items-start justify-content-between gap-3 flex-wrap">
                            <div>
                                <h1 class="cv-player-movie-title">{{ $watch['title'] }}</h1>
                                <p class="cv-player-ep-title">{{ $watch['episode_title'] }}</p>
                            </div>
                            <div class="d-flex gap-2 flex-shrink-0">
                                <span class="badge-age t18">{{ $watch['age_rating'] }}</span>
                                <span class="badge-access premium">VIP</span>
                                <span class="badge-quality">{{ $watch['quality'] }}</span>
                            </div>
                        </div>
                        <div class="cv-player-meta-row">
                            <span>{{ $watch['genre'] }}</span>
                            <span class="dot"></span>
                            <span>{{ $watch['year'] }}</span>
                            <span class="dot"></span>
                            <span>{{ $watch['duration'] }} / tập</span>
                            <span class="dot"></span>
                            <span>Phần {{ $watch['season_num'] }} · Tập {{ $watch['episode_num'] }}/{{ $watch['total_eps'] }}</span>
                        </div>
                        <p style="font-size:13px;color:var(--cv-text-secondary);line-height:1.65;margin-top:12px;margin-bottom:0;max-width:620px">
                            {{ $watch['synopsis'] }}
                        </p>
                    </div>

                    {{-- Server Tabs --}}
                    {{-- Server Tabs --}}
                    <div class="cv-server-tabs">
                        <p class="cv-server-tabs-title">Chọn server phát</p>
                        <div class="cv-server-row" role="group" aria-label="Chọn server">
                            @foreach($watch['servers'] as $srv)
                            <button class="cv-server-btn {{ $srv === $watch['current_server'] ? 'active' : '' }}"
                                    aria-pressed="{{ $srv === $watch['current_server'] ? 'true' : 'false' }}">
                                {{ $srv }}
                            </button>
                            @endforeach
                        </div>

                        <p class="cv-server-tabs-title mt-2">Danh sách tập &mdash; Phần {{ $watch['season_num'] }}</p>
                        {{-- Episode List --}}
                        <div class="cv-ep-scroll" role="list" aria-label="Danh sách tập">
                            @for($ep = 1; $ep <= $watch['total_eps']; $ep++)
                            <button class="cv-ep-btn {{ $ep === $watch['episode_num'] ? 'active' : '' }} {{ $ep > 22 ? 'locked' : '' }}"
                                    @if($ep > 22) disabled @endif
                                    aria-label="Tập {{ $ep }}" role="listitem"
                                    title="{{ $ep > 22 ? 'Tập '.$ep.' - Sắp ra mắt' : 'Tập '.$ep }}">
                                {{ $ep }}
                            </button>
                            @endfor
                        </div>
                        <p style="font-size:11px;color:var(--cv-text-muted);margin-top:8px;margin-bottom:0">
                            <i class="bi bi-lock-fill" style="color:var(--cv-gold)"></i> = Tập chưa chiếu
                        </p>
                    </div>

                    {{-- Action Buttons --}}
                    {{-- Action Buttons --}}
                    <div class="cv-player-actions">
                        <button class="btn-cv-ghost" style="font-size:13px;padding:7px 14px">
                            <i class="bi bi-plus-circle"></i> Thêm vào danh sách
                        </button>
                        <button class="btn-cv-ghost" style="font-size:13px;padding:7px 14px">
                            <i class="bi bi-share"></i> Chia sẻ
                        </button>
                        <button class="btn-cv-ghost" style="font-size:13px;padding:7px 14px">
                            <i class="bi bi-flag"></i> Báo lỗi
                        </button>
                        <button class="btn-cv-ghost" style="font-size:13px;padding:7px 14px">
                            <i class="bi bi-film"></i> Xem trailer
                        </button>
                        <a href="{{ url('/movie/'.($watch['slug'])) }}" class="btn-cv-outline" style="font-size:13px;padding:7px 14px">
                            <i class="bi bi-arrow-left-circle"></i> Chi tiết phim
                        </a>
                    </div>

                    {{-- Next Episode --}}
                    {{-- Tập tiếp theo --}}
                    @if($watch['episode_num'] < $watch['total_eps'])
                    <div class="mb-3">
                        <p style="font-size:13px;font-weight:700;color:var(--cv-text-secondary);margin-bottom:10px;letter-spacing:.5px">
                            <i class="bi bi-skip-forward-fill me-2" style="color:var(--cv-purple)"></i>TẬP TIẾP THEO
                        </p>
                        <a href="{{ url('/watch/'.($watch['slug']).'?ep='.($watch['episode_num']+1)) }}" class="cv-next-ep-card">
                            <img src="https://picsum.photos/seed/next-ep/192/120"
                                 alt="Tập {{ $watch['episode_num'] + 1 }}" class="cv-next-ep-thumb">
                            <div>
                                <div class="cv-next-ep-label">Tập tiếp theo</div>
                                <div class="cv-next-ep-title">
                                    Tập {{ $watch['episode_num'] + 1 }}: {{ $watch['episode_num'] + 1 === 2 ? 'Bóng tối trỗi dậy' : 'Phần tiếp theo' }}
                                </div>
                                <div class="cv-next-ep-meta">{{ $watch['title'] }} · {{ $watch['duration'] }}</div>
                            </div>
                            <div class="ms-auto flex-shrink-0">
                                <button class="btn-cv-primary" style="padding:7px 16px;font-size:13px" aria-label="Phát tập tiếp theo">
                                    <i class="bi bi-play-fill"></i> Phát
                                </button>
                            </div>
                        </a>
                    </div>
                    @endif

                </div>
                {{-- /Left Column --}}


                {{-- Right Sidebar --}}
                <div class="col-lg-4 col-xl-3">

                    {{-- Phim đề xuất --}}
                    <div style="margin-bottom:20px">
                        <p style="font-size:13px;font-weight:700;color:var(--cv-text-secondary);margin-bottom:12px;letter-spacing:.5px;padding-bottom:10px;border-bottom:1px solid var(--cv-border)">
                            <i class="bi bi-collection-play-fill me-2" style="color:var(--cv-purple)"></i>PHIM ĐỀ XUẤT
                        </p>
                        @php
                        $suggested = [
                            ['title'=>'Nữ Hoàng Bóng Đêm','meta'=>'Tập 15/24 · Cổ trang','seed'=>'sg1','access'=>'premium'],
                            ['title'=>'Vương Triều Lửa','meta'=>'Phim lẻ · 130 phút','seed'=>'sg2','access'=>'rental'],
                            ['title'=>'Gia Tộc Danh Gia','meta'=>'Tập 22/48 · Gia đình','seed'=>'sg3','access'=>'premium'],
                            ['title'=>'Huyết Chiến Đèo Ngang','meta'=>'Phim lẻ · 142 phút','seed'=>'sg4','access'=>'premium'],
                            ['title'=>'Cạm Bẫy Đêm Khuya','meta'=>'Tập 8/28 · Hình sự','seed'=>'sg5','access'=>'premium'],
                            ['title'=>'Đảo Sinh Tử','meta'=>'Tập 9/16 · Hành động','seed'=>'sg6','access'=>'premium'],
                            ['title'=>'Bộ Tứ Huyền Thoại','meta'=>'Tập 5/16 · Hành động','seed'=>'sg7','access'=>'premium'],
                        ];
                        @endphp

                        @foreach($suggested as $s)
                        <a href="{{ url('/watch/'.Str::slug($s['title'])) }}"
                           style="display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--cv-border);text-decoration:none;transition:opacity .18s"
                           onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'">
                            <div style="position:relative;flex-shrink:0">
                                <img src="https://picsum.photos/seed/{{ $s['seed'] }}/120/68"
                                     alt="{{ $s['title'] }}"
                                     style="width:88px;height:56px;object-fit:cover;border-radius:6px;background:var(--cv-bg-elevated)">
                                <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.3);border-radius:6px;opacity:0;transition:opacity .18s"
                                     class="suggested-overlay">
                                    <i class="bi bi-play-fill" style="color:#fff;font-size:16px"></i>
                                </div>
                            </div>
                            <div style="min-width:0;flex:1">
                                <div style="font-size:13px;font-weight:600;color:var(--cv-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px">{{ $s['title'] }}</div>
                                <div style="font-size:11px;color:var(--cv-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ $s['meta'] }}</div>
                                <span class="badge-access {{ $s['access'] }}" style="font-size:9px;padding:1px 5px;margin-top:4px;display:inline-flex">
                                    {{ $s['access'] === 'premium' ? 'VIP' : 'Thuê' }}
                                </span>
                            </div>
                        </a>
                        @endforeach
                    </div>

                    {{-- Cùng thể loại --}}
                    <div>
                        <p style="font-size:13px;font-weight:700;color:var(--cv-text-secondary);margin-bottom:12px;letter-spacing:.5px;padding-bottom:10px;border-bottom:1px solid var(--cv-border)">
                            <i class="bi bi-tag-fill me-2" style="color:var(--cv-purple)"></i>CÙNG THỂ LOẠI
                        </p>
                        @php
                        $sameGenre = [
                            ['title'=>'Bộ Tứ Anh Hùng','meta'=>'2024 · 24 tập','seed'=>'cg1','access'=>'premium'],
                            ['title'=>'Mặt Trận Vô Hình','meta'=>'2023 · 20 tập','seed'=>'cg2','access'=>'free'],
                            ['title'=>'Hoàng Tộc Đại Chiến','meta'=>'2024 · 36 tập','seed'=>'cg3','access'=>'premium'],
                            ['title'=>'Kiếm Thánh','meta'=>'2023 · 40 tập','seed'=>'cg4','access'=>'premium'],
                            ['title'=>'Quân Sư Xuất Chiêu','meta'=>'2022 · 28 tập','seed'=>'cg5','access'=>'free'],
                        ];
                        @endphp
                        @foreach($sameGenre as $s)
                        <a href="{{ url('/movie/'.Str::slug($s['title'])) }}"
                           style="display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--cv-border);text-decoration:none;transition:opacity .18s"
                           onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'">
                            <img src="https://picsum.photos/seed/{{ $s['seed'] }}/120/68"
                                 alt="{{ $s['title'] }}"
                                 style="width:88px;height:56px;object-fit:cover;border-radius:6px;flex-shrink:0;background:var(--cv-bg-elevated)">
                            <div style="min-width:0;flex:1">
                                <div style="font-size:13px;font-weight:600;color:var(--cv-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px">{{ $s['title'] }}</div>
                                <div style="font-size:11px;color:var(--cv-text-muted)">{{ $s['meta'] }}</div>
                            </div>
                        </a>
                        @endforeach
                    </div>

                </div>
                {{-- /Right Sidebar --}}

            </div><!-- /row -->
        </div><!-- /container -->
    </div>
    {{-- /Player Body --}}

</div>
{{-- /cv-player-page --}}

@endsection

@section('scripts')
<script>
(function(){
    // Inject back button into compact header
    var headerInner = document.querySelector('.cv-header-inner');
    if(headerInner){
        var backBtn = document.createElement('a');
        backBtn.href = '{{ url('/movie/'.($watch['slug'] ?? '#')) }}';
        backBtn.className = 'cv-player-back-btn';
        backBtn.innerHTML = '<i class="bi bi-arrow-left"></i> Quay lại';
        backBtn.style.marginRight = '12px';
        headerInner.insertBefore(backBtn, headerInner.firstChild);

        var titleEl = document.createElement('div');
        titleEl.innerHTML = '<span class="cv-player-header-title">{{ $watch['title'] }}</span><span class="cv-player-header-ep">· {{ $watch['episode_title'] }}</span>';
        headerInner.insertBefore(titleEl, headerInner.children[1]);
    }

    // Hover effect on suggested items
    document.querySelectorAll('.suggested-overlay').forEach(function(el){
        el.parentElement.addEventListener('mouseenter', function(){ el.style.opacity='1'; });
        el.parentElement.addEventListener('mouseleave', function(){ el.style.opacity='0'; });
    });
})();
</script>
@endsection
