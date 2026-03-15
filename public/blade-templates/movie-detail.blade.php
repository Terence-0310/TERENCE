{{-- ============================================================
     VIEW: resources/views/movie-detail.blade.php
     Route: /movie/{slug}
     Layout: layouts.app
============================================================ --}}

@extends('layouts.app')

@section('title', ($movie['title'] ?? 'Chi tiết phim') . ' - CinéViet')

@section('head_styles')
<style>
    /* ============================================
       MOVIE DETAIL PAGE STYLES
    ============================================ */

    /* ---- Detail Hero ---- */
    .cv-detail-hero {
        position: relative; width: 100%;
        min-height: clamp(400px, 50vw, 600px);
        overflow: hidden; background: #000;
    }
    .cv-detail-backdrop {
        position: absolute; inset: 0;
        background-size: cover; background-position: center 20%;
        filter: blur(1px); transform: scale(1.03);
    }
    .cv-detail-overlay-top {
        position: absolute; inset: 0;
        background: linear-gradient(to bottom, rgba(10,10,15,.3) 0%, transparent 40%);
    }
    .cv-detail-overlay-main {
        position: absolute; inset: 0;
        background: linear-gradient(to right, rgba(10,10,15,.97) 0%, rgba(10,10,15,.88) 38%, rgba(10,10,15,.55) 65%, rgba(10,10,15,.15) 100%);
    }
    .cv-detail-overlay-bottom {
        position: absolute; bottom: 0; left: 0; right: 0; height: 160px;
        background: linear-gradient(to top, rgba(10,10,15,1) 0%, transparent 100%);
    }
    .cv-detail-content {
        position: relative; z-index: 2;
        padding: 48px 0 56px;
    }
    .cv-detail-poster-wrap {
        flex-shrink: 0;
        width: 180px;
    }
    .cv-detail-poster {
        width: 180px; aspect-ratio: 2/3;
        object-fit: cover; border-radius: 10px;
        border: 2px solid var(--cv-border);
        box-shadow: 0 12px 40px rgba(0,0,0,.6);
    }
    .cv-detail-poster-badges {
        display: flex; gap: 4px; margin-top: 8px; flex-wrap: wrap;
    }

    .cv-detail-info { flex: 1; min-width: 0; }
    .cv-detail-eyebrow {
        font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
        color: var(--cv-accent); font-weight: 700; margin-bottom: 10px;
        display: flex; align-items: center; gap: 6px;
    }
    .cv-detail-title {
        font-size: clamp(24px, 4vw, 42px); font-weight: 900; line-height: 1.1;
        margin-bottom: 4px;
    }
    .cv-detail-subtitle {
        font-size: 15px; color: var(--cv-text-secondary); font-style: italic; margin-bottom: 14px;
    }
    .cv-detail-badges {
        display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; align-items: center;
    }
    .cv-detail-stars {
        display: flex; align-items: center; gap: 3px;
    }
    .cv-detail-stars i { color: var(--cv-gold); font-size: 13px; }
    .cv-detail-score {
        font-size: 13px; font-weight: 700; color: var(--cv-gold); margin-left: 2px;
    }
    .cv-detail-synopsis {
        font-size: 14px; color: var(--cv-text-secondary); line-height: 1.7;
        max-width: 600px; margin-bottom: 22px;
    }
    .cv-detail-actions {
        display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 28px;
    }

    /* ---- Detail Meta Grid ---- */
    .cv-meta-grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 0;
    }
    .cv-meta-item {
        padding: 12px 0; border-bottom: 1px solid var(--cv-border);
        display: flex; gap: 10px; align-items: flex-start;
    }
    .cv-meta-label {
        font-size: 11px; font-weight: 700; letter-spacing: .8px;
        text-transform: uppercase; color: var(--cv-text-muted);
        min-width: 90px; flex-shrink: 0; padding-top: 1px;
    }
    .cv-meta-value {
        font-size: 13px; color: var(--cv-text-primary); font-weight: 500; line-height: 1.5;
    }
    .cv-meta-value a { color: var(--cv-accent); }
    .cv-meta-value a:hover { text-decoration: underline; }

    /* ---- Content Tabs ---- */
    .cv-detail-tabs {
        display: flex; gap: 0; border-bottom: 1px solid var(--cv-border);
        margin-bottom: 28px; overflow-x: auto; scrollbar-width: none;
    }
    .cv-detail-tabs::-webkit-scrollbar { display: none; }
    .cv-detail-tab-btn {
        background: transparent; border: none; color: var(--cv-text-muted);
        padding: 12px 20px; font-size: 14px; font-weight: 600; cursor: pointer;
        border-bottom: 2px solid transparent; margin-bottom: -1px;
        transition: color .18s, border-color .18s; white-space: nowrap;
    }
    .cv-detail-tab-btn.active { color: var(--cv-accent); border-bottom-color: var(--cv-purple); }
    .cv-detail-tab-btn:hover:not(.active) { color: var(--cv-text-primary); }

    /* ---- Episode Grid ---- */
    .cv-ep-grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(54px, 1fr)); gap: 8px;
    }
    .cv-ep-item {
        position: relative; border-radius: 7px; overflow: hidden;
        border: 1.5px solid var(--cv-border); cursor: pointer;
        transition: border-color .18s; background: var(--cv-bg-surface);
    }
    .cv-ep-item:hover { border-color: var(--cv-border-hover); }
    .cv-ep-item.active { border-color: var(--cv-purple); }
    .cv-ep-item.active .cv-ep-num { color: var(--cv-accent); }
    .cv-ep-item.locked { opacity: .55; cursor: default; }
    .cv-ep-num {
        display: block; text-align: center; padding: 9px 4px;
        font-size: 13px; font-weight: 600; color: var(--cv-text-secondary);
    }
    .cv-ep-item.active .cv-ep-num { color: var(--cv-accent); }
    .cv-ep-lock {
        position: absolute; top: 4px; right: 5px;
        font-size: 9px; color: var(--cv-gold);
    }

    /* ---- Cast grid ---- */
    .cv-cast-grid {
        display: flex; gap: 14px; overflow-x: auto; padding-bottom: 6px; scrollbar-width: none;
    }
    .cv-cast-grid::-webkit-scrollbar { display: none; }
    .cv-cast-item { flex-shrink: 0; text-align: center; width: 80px; }
    .cv-cast-avatar {
        width: 64px; height: 64px; border-radius: 50%;
        object-fit: cover; display: block; margin: 0 auto 6px;
        border: 2px solid var(--cv-border);
    }
    .cv-cast-name { font-size: 12px; font-weight: 600; color: var(--cv-text-primary); line-height: 1.3; }
    .cv-cast-role { font-size: 10px; color: var(--cv-text-muted); }

    /* ---- Section container ---- */
    .cv-detail-section {
        background: var(--cv-bg-card); border: 1px solid var(--cv-border);
        border-radius: 10px; padding: 22px 24px; margin-bottom: 20px;
    }
    .cv-detail-section-title {
        font-size: 14px; font-weight: 700; color: var(--cv-text-primary);
        margin-bottom: 18px;
        display: flex; align-items: center; gap: 7px;
    }
    .cv-detail-section-title i { color: var(--cv-purple); }

    /* ---- Season selector ---- */
    .cv-season-select {
        background: var(--cv-bg-surface); border: 1px solid var(--cv-border);
        color: var(--cv-text-primary); padding: 6px 12px; border-radius: 6px;
        font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit;
        outline: none;
    }
    .cv-season-select:focus { border-color: var(--cv-purple); }
    .cv-season-select option { background: var(--cv-bg-surface); }

    @media (max-width: 767.98px) {
        .cv-detail-poster-wrap { width: 130px; }
        .cv-detail-poster { width: 130px; }
        .cv-detail-content { padding: 28px 0 40px; }
        .cv-detail-hero { min-height: 500px; }
        .cv-meta-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 575.98px) {
        .cv-detail-layout { flex-direction: column; align-items: center; text-align: center; }
        .cv-detail-synopsis { max-width: 100%; }
        .cv-detail-badges { justify-content: center; }
        .cv-detail-actions { justify-content: center; }
    }
</style>
@endsection

@section('content')

{{-- ============================================================
     Movie Detail Hero
============================================================ --}}

{{-- Placeholder movie data (in real app, pass $movie from controller) --}}
@php
$movie = $movie ?? [
    'title'        => 'Triều Đại Bóng Tối',
    'subtitle'     => 'Dynasty of Shadows',
    'slug'         => 'trieu-dai-bong-toi',
    'description'  => 'Giữa triều đình hỗn loạn cuối thế kỷ 19, Hoàng tử Minh Anh bị tố phản quốc và bị đày ra biên ải. Trên đường trở về rửa oan, anh phát hiện âm mưu tày trời đang nhắm vào hoàng tộc. Bộ phim dã sử hoành tráng nhất năm với bối cảnh tráng lệ, phục trang tinh xảo và dàn diễn viên hùng hậu.',
    'poster'       => 'https://picsum.photos/seed/detail-poster/360/540',
    'backdrop'     => 'https://picsum.photos/seed/detail-bg/1920/900',
    'age_rating'   => 'T18',
    'access_type'  => 'premium',
    'quality'      => '4K HDR',
    'year'         => 2024,
    'genre'        => ['Cổ trang', 'Lịch sử', 'Hành động'],
    'country'      => 'Việt Nam',
    'language'     => 'Tiếng Việt',
    'subtitle_type'=> ['Phụ đề Tiếng Anh', 'Thuyết minh'],
    'duration'     => null,
    'episodes'     => 32,
    'director'     => 'Trần Văn An',
    'cast'         => ['Nguyễn Minh Khôi','Trần Bảo Châu','Lê Thị Lan Anh','Phạm Đình Dũng','Hoàng Văn Bình','Ngô Thị Hải','Lưu Thanh Nam'],
    'rating'       => 8.7,
    'is_series'    => true,
    'season_count' => 1,
    'studio'       => 'CinéViet Originals',
    'release_date' => '12/01/2024',
    'tags'         => ['Độc quyền','Phim mới','Đang chiếu','Hot'],
];
@endphp

<section class="cv-detail-hero" aria-label="Thông tin phim {{ $movie['title'] }}">
    <div class="cv-detail-backdrop" style="background-image: url('{{ $movie['backdrop'] }}')"></div>
    <div class="cv-detail-overlay-top"></div>
    <div class="cv-detail-overlay-main"></div>
    <div class="cv-detail-overlay-bottom"></div>

    <div class="cv-detail-content">
        <div class="container">
            <div class="d-flex gap-4 align-items-start cv-detail-layout">

                {{-- Poster --}}
                <div class="cv-detail-poster-wrap">
                    <img src="{{ $movie['poster'] }}"
                         alt="Poster {{ $movie['title'] }}" class="cv-detail-poster">
                    <div class="cv-detail-poster-badges">
                        <span class="badge-quality">{{ $movie['quality'] }}</span>
                        @if($movie['is_series'])
                        <span style="background:var(--cv-bg-surface);border:1px solid var(--cv-border);color:var(--cv-text-secondary);font-size:10px;padding:2px 7px;border-radius:3px;font-weight:600">
                            {{ $movie['episodes'] }} TẬP
                        </span>
                        @endif
                    </div>
                </div>

                {{-- Info --}}
                <div class="cv-detail-info">

                    {{-- Breadcrumb --}}
                    <nav aria-label="Đường dẫn" style="margin-bottom:8px">
                        <ol class="d-flex align-items-center gap-1 list-unstyled mb-0" style="font-size:12px;color:var(--cv-text-muted)">
                            <li><a href="{{ url('/') }}" style="color:var(--cv-text-muted)">Trang chủ</a></li>
                            <li><i class="bi bi-chevron-right" style="font-size:10px"></i></li>
                            <li><a href="{{ url('/phim-bo') }}" style="color:var(--cv-text-muted)">Phim bộ</a></li>
                            <li><i class="bi bi-chevron-right" style="font-size:10px"></i></li>
                            <li style="color:var(--cv-text-secondary)">{{ $movie['title'] }}</li>
                        </ol>
                    </nav>

                    <p class="cv-detail-eyebrow">
                        <i class="bi bi-gem"></i> {{ $movie['studio'] ?? 'CinéViet Original' }}
                    </p>

                    <h1 class="cv-detail-title">{{ $movie['title'] }}</h1>
                    <p class="cv-detail-subtitle">{{ $movie['subtitle'] }}</p>

                    <div class="cv-detail-badges">
                        <span class="badge-age {{ $movie['age_rating'] === 'T18' ? 't18' : ($movie['age_rating'] === 'T16' ? 't16' : ($movie['age_rating'] === 'T13' ? 't13' : 'p')) }}">
                            {{ $movie['age_rating'] }}
                        </span>
                        <span class="badge-access {{ $movie['access_type'] }}">
                            {{ $movie['access_type'] === 'premium' ? 'Premium VIP' : ($movie['access_type'] === 'rental' ? 'Phim thuê' : 'Miễn phí') }}
                        </span>
                        <span class="badge-quality">{{ $movie['quality'] }}</span>

                        {{-- Tags --}}
                        @foreach(($movie['tags'] ?? []) as $tag)
                        <span style="background:rgba(255,255,255,.07);border:1px solid var(--cv-border);color:var(--cv-text-secondary);font-size:10px;padding:2px 7px;border-radius:3px;font-weight:600;letter-spacing:.5px">
                            {{ $tag }}
                        </span>
                        @endforeach
                    </div>

                    {{-- Star rating --}}
                    <div class="d-flex align-items-center gap-3 mb-3">
                        <div class="cv-detail-stars">
                            @for($i = 1; $i <= 5; $i++)
                                <i class="bi {{ $i <= round($movie['rating']/2) ? 'bi-star-fill' : 'bi-star' }}"></i>
                            @endfor
                            <span class="cv-detail-score">{{ $movie['rating'] }}/10</span>
                        </div>
                        <span style="font-size:12px;color:var(--cv-text-muted)">· {{ number_format(1247000) }} lượt xem</span>
                    </div>

                    <p class="cv-detail-synopsis">{{ $movie['description'] }}</p>

                    <div class="cv-detail-actions">
                        <a href="{{ url('/watch/'.$movie['slug']) }}" class="btn-cv-primary">
                            <i class="bi bi-play-fill"></i> Xem ngay
                        </a>
                        @if($movie['access_type'] === 'rental')
                        <button class="btn-cv-outline">
                            <i class="bi bi-bag"></i> Thuê phim &bull; 39.000đ
                        </button>
                        @endif
                        <button class="btn-cv-outline">
                            <i class="bi bi-film"></i> Xem trailer
                        </button>
                        <button class="btn-cv-ghost" title="Thêm vào danh sách">
                            <i class="bi bi-plus-lg"></i> Danh sách
                        </button>
                        <button class="btn-cv-ghost" title="Chia sẻ">
                            <i class="bi bi-share"></i>
                        </button>
                    </div>

                    {{-- Quick meta row --}}
                    <div class="d-flex flex-wrap gap-3" style="font-size:13px;color:var(--cv-text-secondary)">
                        <span><i class="bi bi-calendar3 me-1" style="color:var(--cv-text-muted)"></i>{{ $movie['year'] }}</span>
                        <span><i class="bi bi-globe me-1" style="color:var(--cv-text-muted)"></i>{{ $movie['country'] }}</span>
                        @if($movie['is_series'])
                        <span><i class="bi bi-collection-play me-1" style="color:var(--cv-text-muted)"></i>{{ $movie['episodes'] }} tập</span>
                        @else
                        <span><i class="bi bi-clock me-1" style="color:var(--cv-text-muted)"></i>{{ $movie['duration'] }}</span>
                        @endif
                        <span><i class="bi bi-tag me-1" style="color:var(--cv-text-muted)"></i>{{ implode(', ', (array)$movie['genre']) }}</span>
                    </div>

                </div>
            </div>
        </div>
    </div>
</section>
{{-- /Movie Detail Hero --}}


{{-- ============================================================
     Movie Detail Body
============================================================ --}}
<div class="container py-4">
    <div class="row g-4">

        {{-- Main Column --}}
        <div class="col-lg-8 col-xl-9">

            {{-- Content Tabs --}}
            <div class="cv-detail-tabs" role="tablist">
                <button class="cv-detail-tab-btn active" data-tab="episodes" role="tab" aria-selected="true">
                    Danh sách tập
                </button>
                <button class="cv-detail-tab-btn" data-tab="synopsis" role="tab" aria-selected="false">
                    Nội dung
                </button>
                <button class="cv-detail-tab-btn" data-tab="cast" role="tab" aria-selected="false">
                    Diễn viên &amp; Ê-kíp
                </button>
                <button class="cv-detail-tab-btn" data-tab="details" role="tab" aria-selected="false">
                    Thông tin chi tiết
                </button>
                <button class="cv-detail-tab-btn" data-tab="reviews" role="tab" aria-selected="false">
                    Đánh giá
                </button>
            </div>

            {{-- Tab: Episodes --}}
            {{-- Episode List --}}
            <div class="cv-tab-panel" id="tab-episodes">

                {{-- Season selector --}}
                <div class="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                    <div class="d-flex align-items-center gap-3">
                        <select class="cv-season-select" aria-label="Chọn phần phim">
                            <option>Phần 1 (32 tập)</option>
                        </select>
                        <span style="font-size:12px;color:var(--cv-text-muted)">Đang chiếu · Tập mới mỗi thứ Tư & Thứ Sáu</span>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn-cv-ghost" style="padding:6px 12px;font-size:12px">
                            <i class="bi bi-sort-down me-1"></i>Sắp xếp
                        </button>
                    </div>
                </div>

                {{-- Episode grid --}}
                <div class="cv-ep-grid" role="list" aria-label="Danh sách tập">
                    @for($ep = 1; $ep <= 32; $ep++)
                    <div class="cv-ep-item cv-ep-btn {{ $ep === 1 ? 'active' : '' }} {{ $ep > 22 ? 'locked' : '' }}"
                         role="listitem" aria-label="Tập {{ $ep }}"
                         title="Tập {{ $ep }}{{ $ep > 22 ? ' - Sắp ra mắt' : '' }}">
                        <span class="cv-ep-num">{{ $ep }}</span>
                        @if($ep > 22)
                        <span class="cv-ep-lock"><i class="bi bi-lock-fill"></i></span>
                        @endif
                    </div>
                    @endfor
                </div>

                <p class="mt-3" style="font-size:12px;color:var(--cv-text-muted)">
                    <i class="bi bi-info-circle me-1"></i>
                    Tập 23–32 sẽ được cập nhật vào thứ Tư &amp; Thứ Sáu hàng tuần.
                    <span style="color:var(--cv-gold)"><i class="bi bi-lock-fill"></i></span> = Chưa chiếu
                </p>

            </div>

            {{-- Tab: Synopsis --}}
            <div class="cv-tab-panel" id="tab-synopsis" style="display:none">
                <div class="cv-detail-section">
                    <p class="cv-detail-section-title"><i class="bi bi-file-text"></i> Nội dung phim</p>
                    <p style="font-size:14px;color:var(--cv-text-secondary);line-height:1.8">
                        Giữa triều đình hỗn loạn cuối thế kỷ 19, Hoàng tử Minh Anh bị tố phản quốc và bị đày ra biên ải. Trên đường trở về rửa oan, anh phát hiện âm mưu tày trời đang nhắm vào hoàng tộc. Người thân hóa thù, kẻ thù thành đồng minh — mỗi bước chân là một cuộc chiến sinh tử giữa lòng trung thành và ham muốn quyền lực.
                    </p>
                    <p style="font-size:14px;color:var(--cv-text-secondary);line-height:1.8;margin-top:12px">
                        Bộ phim dã sử hoành tráng nhất năm với bối cảnh tráng lệ, phục trang tinh xảo và dàn diễn viên hùng hậu. Được ghi hình tại 5 tỉnh thành với hơn 2.000 diễn viên quần chúng và bộ phục trang lên đến 10.000 bộ, "Triều Đại Bóng Tối" hứa hẹn là tác phẩm lịch sử đỉnh cao nhất của điện ảnh Việt Nam trong thập kỷ.
                    </p>
                </div>
            </div>

            {{-- Tab: Cast --}}
            <div class="cv-tab-panel" id="tab-cast" style="display:none">
                <div class="cv-detail-section">
                    <p class="cv-detail-section-title"><i class="bi bi-people"></i> Diễn viên chính</p>
                    <div class="cv-cast-grid">
                        @php
                        $castList = [
                            ['name'=>'Nguyễn Minh Khôi','role'=>'Hoàng tử Minh Anh','seed'=>'ca1'],
                            ['name'=>'Trần Bảo Châu','role'=>'Công chúa Lan Nhi','seed'=>'ca2'],
                            ['name'=>'Lê Thị Lan Anh','role'=>'Thái hậu','seed'=>'ca3'],
                            ['name'=>'Phạm Đình Dũng','role'=>'Thừa tướng Trần Hào','seed'=>'ca4'],
                            ['name'=>'Hoàng Văn Bình','role'=>'Tướng quân Lâm','seed'=>'ca5'],
                            ['name'=>'Ngô Thị Hải','role'=>'Mưu sĩ Phượng','seed'=>'ca6'],
                            ['name'=>'Lưu Thanh Nam','role'=>'Hoàng đế','seed'=>'ca7'],
                            ['name'=>'Đinh Hoàng Long','role'=>'Đại thần Tuấn','seed'=>'ca8'],
                        ];
                        @endphp
                        @foreach($castList as $actor)
                        <div class="cv-cast-item">
                            <img src="https://picsum.photos/seed/{{ $actor['seed'] }}/128/128"
                                 alt="{{ $actor['name'] }}" class="cv-cast-avatar" loading="lazy">
                            <div class="cv-cast-name">{{ $actor['name'] }}</div>
                            <div class="cv-cast-role">{{ $actor['role'] }}</div>
                        </div>
                        @endforeach
                    </div>
                    <hr class="cv-divider">
                    <div class="row g-2" style="font-size:13px">
                        <div class="col-sm-6 col-md-4">
                            <span style="color:var(--cv-text-muted)">Đạo diễn:</span>
                            <a href="#" class="ms-2" style="color:var(--cv-accent)">{{ $movie['director'] }}</a>
                        </div>
                        <div class="col-sm-6 col-md-4">
                            <span style="color:var(--cv-text-muted)">Biên kịch:</span>
                            <a href="#" class="ms-2" style="color:var(--cv-accent)">Nguyễn Thị Hồng</a>
                        </div>
                        <div class="col-sm-6 col-md-4">
                            <span style="color:var(--cv-text-muted)">Sản xuất:</span>
                            <span class="ms-2">{{ $movie['studio'] }}</span>
                        </div>
                    </div>
                </div>
            </div>

            {{-- Tab: Details --}}
            {{-- Movie Meta --}}
            <div class="cv-tab-panel" id="tab-details" style="display:none">
                <div class="cv-detail-section">
                    <p class="cv-detail-section-title"><i class="bi bi-info-circle"></i> Thông tin chi tiết</p>
                    <div class="cv-meta-grid">
                        <div class="cv-meta-item">
                            <span class="cv-meta-label">Thể loại</span>
                            <span class="cv-meta-value">
                                @foreach((array)$movie['genre'] as $g)
                                <a href="{{ url('/the-loai/'.Str::slug($g)) }}">{{ $g }}</a>{{ !$loop->last ? ', ' : '' }}
                                @endforeach
                            </span>
                        </div>
                        <div class="cv-meta-item">
                            <span class="cv-meta-label">Quốc gia</span>
                            <span class="cv-meta-value"><a href="{{ url('/quoc-gia/viet-nam') }}">{{ $movie['country'] }}</a></span>
                        </div>
                        <div class="cv-meta-item">
                            <span class="cv-meta-label">Năm SX</span>
                            <span class="cv-meta-value">{{ $movie['year'] }}</span>
                        </div>
                        <div class="cv-meta-item">
                            <span class="cv-meta-label">Phát hành</span>
                            <span class="cv-meta-value">{{ $movie['release_date'] }}</span>
                        </div>
                        @if($movie['is_series'])
                        <div class="cv-meta-item">
                            <span class="cv-meta-label">Số tập</span>
                            <span class="cv-meta-value">{{ $movie['episodes'] }} tập ({{ $movie['season_count'] }} phần)</span>
                        </div>
                        @else
                        <div class="cv-meta-item">
                            <span class="cv-meta-label">Thời lượng</span>
                            <span class="cv-meta-value">{{ $movie['duration'] }}</span>
                        </div>
                        @endif
                        <div class="cv-meta-item">
                            <span class="cv-meta-label">Ngôn ngữ</span>
                            <span class="cv-meta-value">{{ $movie['language'] }}</span>
                        </div>
                        <div class="cv-meta-item">
                            <span class="cv-meta-label">Phụ đề</span>
                            <span class="cv-meta-value">{{ implode(', ', (array)$movie['subtitle_type']) }}</span>
                        </div>
                        <div class="cv-meta-item">
                            <span class="cv-meta-label">Chất lượng</span>
                            <span class="cv-meta-value">{{ $movie['quality'] }}</span>
                        </div>
                        <div class="cv-meta-item">
                            <span class="cv-meta-label">Phân loại</span>
                            <span class="cv-meta-value">{{ $movie['age_rating'] }} &mdash; Trên {{ substr($movie['age_rating'], 1) }} tuổi</span>
                        </div>
                        <div class="cv-meta-item">
                            <span class="cv-meta-label">Đạo diễn</span>
                            <span class="cv-meta-value"><a href="#">{{ $movie['director'] }}</a></span>
                        </div>
                        <div class="cv-meta-item">
                            <span class="cv-meta-label">Diễn viên</span>
                            <span class="cv-meta-value">{{ implode(', ', array_slice((array)$movie['cast'], 0, 4)) }}...</span>
                        </div>
                        <div class="cv-meta-item">
                            <span class="cv-meta-label">Studio</span>
                            <span class="cv-meta-value">{{ $movie['studio'] }}</span>
                        </div>
                    </div>
                </div>
            </div>

            {{-- Tab: Reviews --}}
            <div class="cv-tab-panel" id="tab-reviews" style="display:none">
                <div class="cv-detail-section">
                    <p class="cv-detail-section-title"><i class="bi bi-chat-square-text"></i> Đánh giá khán giả</p>
                    <div class="d-flex align-items-center gap-4 mb-4">
                        <div class="text-center">
                            <div style="font-size:48px;font-weight:900;color:var(--cv-gold);line-height:1">{{ $movie['rating'] }}</div>
                            <div class="cv-detail-stars justify-content-center mt-1">
                                @for($i=1;$i<=5;$i++)
                                <i class="bi {{ $i <= round($movie['rating']/2) ? 'bi-star-fill' : 'bi-star' }}"></i>
                                @endfor
                            </div>
                            <div style="font-size:12px;color:var(--cv-text-muted);margin-top:4px">3.241 đánh giá</div>
                        </div>
                        <div class="flex-1 w-100">
                            @foreach([5=>72, 4=>18, 3=>6, 2=>2, 1=>2] as $stars => $pct)
                            <div class="d-flex align-items-center gap-2 mb-1">
                                <span style="font-size:12px;color:var(--cv-text-muted);width:16px">{{ $stars }}</span>
                                <i class="bi bi-star-fill" style="color:var(--cv-gold);font-size:11px"></i>
                                <div class="progress flex-1" style="height:6px;background:var(--cv-bg-surface);border-radius:3px">
                                    <div class="progress-bar" style="width:{{ $pct }}%;background:var(--cv-gold);border-radius:3px"></div>
                                </div>
                                <span style="font-size:12px;color:var(--cv-text-muted);width:28px">{{ $pct }}%</span>
                            </div>
                            @endforeach
                        </div>
                    </div>
                    <div style="font-size:13px;color:var(--cv-text-muted);text-align:center;padding:12px 0;border-top:1px solid var(--cv-border)">
                        Đăng nhập để gửi đánh giá của bạn
                    </div>
                </div>
            </div>

        </div>
        {{-- /Main Column --}}


        {{-- Sidebar --}}
        <div class="col-lg-4 col-xl-3">

            {{-- Access Info Card --}}
            <div class="cv-detail-section mb-3">
                <p class="cv-detail-section-title mb-3"><i class="bi bi-shield-check"></i> Quyền truy cập</p>
                @if($movie['access_type'] === 'premium')
                <div class="d-flex align-items-start gap-3 mb-3 p-3 rounded-cv" style="background:var(--cv-purple-dim);border:1px solid rgba(124,58,237,.3)">
                    <i class="bi bi-gem" style="color:var(--cv-accent);font-size:22px;flex-shrink:0;margin-top:2px"></i>
                    <div>
                        <div style="font-size:13px;font-weight:700;color:var(--cv-accent);margin-bottom:3px">Yêu cầu Premium</div>
                        <div style="font-size:12px;color:var(--cv-text-muted)">Đăng ký để xem không giới hạn, chất lượng 4K HDR</div>
                    </div>
                </div>
                <a href="{{ url('/goi-dang-ky') }}" class="btn-cv-primary w-100 justify-content-center mb-2">
                    <i class="bi bi-lightning-fill"></i> Đăng ký Premium
                </a>
                <a href="{{ url('/watch/'.$movie['slug']) }}" class="btn-cv-outline w-100 justify-content-center">
                    <i class="bi bi-play-fill"></i> Xem với Premium
                </a>
                @elseif($movie['access_type'] === 'rental')
                <a href="{{ url('/phim-thue/'.$movie['slug']) }}" class="btn-cv-primary w-100 justify-content-center mb-2">
                    <i class="bi bi-bag"></i> Thuê phim &bull; 39.000đ
                </a>
                <p style="font-size:11px;color:var(--cv-text-muted);text-align:center">Xem trong vòng 72 giờ sau khi thuê</p>
                @else
                <a href="{{ url('/watch/'.$movie['slug']) }}" class="btn-cv-primary w-100 justify-content-center">
                    <i class="bi bi-play-fill"></i> Xem miễn phí ngay
                </a>
                @endif
            </div>

            {{-- Share & Actions --}}
            <div class="cv-detail-section mb-3">
                <p class="cv-detail-section-title mb-3"><i class="bi bi-three-dots"></i> Thao tác</p>
                <div class="d-flex flex-column gap-2">
                    <button class="btn-cv-ghost w-100 justify-content-start">
                        <i class="bi bi-plus-circle" style="font-size:16px"></i> Thêm vào danh sách
                    </button>
                    <button class="btn-cv-ghost w-100 justify-content-start">
                        <i class="bi bi-film" style="font-size:16px"></i> Xem trailer
                    </button>
                    <button class="btn-cv-ghost w-100 justify-content-start">
                        <i class="bi bi-share" style="font-size:16px"></i> Chia sẻ phim
                    </button>
                    <button class="btn-cv-ghost w-100 justify-content-start">
                        <i class="bi bi-flag" style="font-size:16px"></i> Báo lỗi nội dung
                    </button>
                </div>
            </div>

            {{-- Tags --}}
            <div class="cv-detail-section">
                <p class="cv-detail-section-title mb-3"><i class="bi bi-tags"></i> Tags</p>
                <div class="d-flex flex-wrap gap-2">
                    @foreach(array_merge((array)$movie['genre'], (array)$movie['tags'], [$movie['country']]) as $tag)
                    <a href="{{ url('/browse?tag='.Str::slug($tag)) }}"
                       style="background:var(--cv-bg-surface);border:1px solid var(--cv-border);color:var(--cv-text-secondary);font-size:12px;padding:4px 10px;border-radius:4px;transition:border-color .18s,color .18s"
                       onmouseover="this.style.borderColor='var(--cv-purple)';this.style.color='var(--cv-accent)'"
                       onmouseout="this.style.borderColor='var(--cv-border)';this.style.color='var(--cv-text-secondary)'">
                        {{ $tag }}
                    </a>
                    @endforeach
                </div>
            </div>

        </div>
        {{-- /Sidebar --}}

    </div><!-- /row -->
</div>
{{-- /Movie Detail Body --}}


{{-- ============================================================
     Related Content Shelves
============================================================ --}}
<div class="container-fluid px-3 px-lg-4 mt-2">

    {{-- Có thể bạn cũng thích --}}
    <section class="cv-shelf" aria-label="Có thể bạn cũng thích">
        <div class="cv-shelf-header">
            <h2 class="cv-shelf-title">Có thể bạn cũng thích</h2>
            <a href="{{ url('/browse?similar='.$movie['slug']) }}" class="cv-shelf-see-all">Xem thêm <i class="bi bi-chevron-right"></i></a>
        </div>
        <div class="cv-shelf-track-wrap">
            <button class="cv-shelf-btn prev" aria-label="Cuộn trái"><i class="bi bi-chevron-left"></i></button>
            <div class="cv-shelf-track" id="shelf-similar">
                @php
                $similar = [
                    ['title'=>'Nữ Hoàng Bóng Đêm','year'=>2024,'genre'=>'Hình sự','age'=>'T18','access'=>'premium','seed'=>'sim1'],
                    ['title'=>'Vương Triều Lửa','year'=>2024,'genre'=>'Cổ trang','age'=>'T16','access'=>'rental','seed'=>'sim2'],
                    ['title'=>'Gia Tộc Danh Gia','year'=>2024,'genre'=>'Gia đình','age'=>'T13','access'=>'premium','seed'=>'sim3'],
                    ['title'=>'Huyết Chiến Đèo Ngang','year'=>2024,'genre'=>'Lịch sử','age'=>'T16','access'=>'premium','seed'=>'sim4'],
                    ['title'=>'Cạm Bẫy Đêm Khuya','year'=>2024,'genre'=>'Hình sự','age'=>'T18','access'=>'premium','seed'=>'sim5'],
                    ['title'=>'Bộ Tứ Huyền Thoại','year'=>2024,'genre'=>'Hành động','age'=>'T16','access'=>'premium','seed'=>'sim6'],
                    ['title'=>'Đảo Sinh Tử','year'=>2024,'genre'=>'Hành động','age'=>'T16','access'=>'premium','seed'=>'sim7'],
                    ['title'=>'Mặt Trận Không Tiếng Súng','year'=>2022,'genre'=>'Chiến tranh','age'=>'T16','access'=>'free','seed'=>'sim8'],
                    ['title'=>'Vùng Đất Hứa','year'=>2024,'genre'=>'Phiêu lưu','age'=>'T16','access'=>'premium','seed'=>'sim9'],
                    ['title'=>'Chiến Binh Cuối Cùng','year'=>2024,'genre'=>'Hành động','age'=>'T18','access'=>'premium','seed'=>'sim10'],
                ];
                @endphp
                @foreach($similar as $m)
                <a href="{{ url('/movie/'.Str::slug($m['title'])) }}" class="cv-card" aria-label="{{ $m['title'] }}">
                    <img src="https://picsum.photos/seed/{{ $m['seed'] }}/280/420"
                         alt="{{ $m['title'] }}" class="cv-card-poster" loading="lazy">
                    <div class="cv-card-overlay"></div>
                    <div class="cv-card-play"><i class="bi bi-play-fill"></i></div>
                    <div class="cv-card-badges">
                        <span class="badge-age {{ $m['age'] === 'T13' ? 't13' : ($m['age'] === 'T16' ? 't16' : 't18') }}">{{ $m['age'] }}</span>
                    </div>
                    <div class="cv-card-badges-br">
                        <span class="badge-access {{ $m['access'] }}">{{ $m['access'] === 'premium' ? 'VIP' : ($m['access'] === 'rental' ? 'Thuê' : 'Free') }}</span>
                    </div>
                    <div class="cv-card-body">
                        <div class="cv-card-title">{{ $m['title'] }}</div>
                        <div class="cv-card-meta">{{ $m['year'] }} · {{ $m['genre'] }}</div>
                    </div>
                </a>
                @endforeach
            </div>
            <button class="cv-shelf-btn next" aria-label="Cuộn phải"><i class="bi bi-chevron-right"></i></button>
        </div>
    </section>

    {{-- Đang thịnh hành --}}
    <section class="cv-shelf" aria-label="Đang thịnh hành">
        <div class="cv-shelf-header">
            <h2 class="cv-shelf-title">Đang thịnh hành</h2>
            <a href="{{ url('/browse?sort=trending') }}" class="cv-shelf-see-all">Xem tất cả <i class="bi bi-chevron-right"></i></a>
        </div>
        <div class="cv-shelf-track-wrap">
            <button class="cv-shelf-btn prev" aria-label="Cuộn trái"><i class="bi bi-chevron-left"></i></button>
            <div class="cv-shelf-track" id="shelf-trending-detail">
                @php
                $trending2 = [
                    ['title'=>'Kẻ Lừa Đảo Cuối Cùng','year'=>2024,'genre'=>'Hình sự','age'=>'T16','access'=>'premium','seed'=>'tr1'],
                    ['title'=>'Linh Hồn Bất Tử','year'=>2024,'genre'=>'Kinh dị','age'=>'T18','access'=>'premium','seed'=>'tr2'],
                    ['title'=>'Đêm Sài Gòn Không Ngủ','year'=>2024,'genre'=>'Tình cảm','age'=>'T13','access'=>'premium','seed'=>'tr3'],
                    ['title'=>'Ngọn Lửa Hoàng Hôn','year'=>2024,'genre'=>'Hành động','age'=>'T16','access'=>'premium','seed'=>'tr4'],
                    ['title'=>'Hồ Sơ Tuyệt Mật','year'=>2024,'genre'=>'Hình sự','age'=>'T16','access'=>'premium','seed'=>'tr5'],
                    ['title'=>'Bí Mật Gia Tộc','year'=>2024,'genre'=>'Tâm lý','age'=>'T13','access'=>'premium','seed'=>'tr6'],
                    ['title'=>'Mưa Tháng Ba','year'=>2023,'genre'=>'Tình cảm','age'=>'P','access'=>'free','seed'=>'tr7'],
                    ['title'=>'Tình Yêu Và Bóng Tối','year'=>2024,'genre'=>'Tình cảm','age'=>'T13','access'=>'rental','seed'=>'tr8'],
                ];
                @endphp
                @foreach($trending2 as $m)
                <a href="{{ url('/movie/'.Str::slug($m['title'])) }}" class="cv-card" aria-label="{{ $m['title'] }}">
                    <img src="https://picsum.photos/seed/{{ $m['seed'] }}/280/420"
                         alt="{{ $m['title'] }}" class="cv-card-poster" loading="lazy">
                    <div class="cv-card-overlay"></div>
                    <div class="cv-card-play"><i class="bi bi-play-fill"></i></div>
                    <div class="cv-card-badges">
                        <span class="badge-age {{ $m['age'] === 'P' ? 'p' : ($m['age'] === 'T13' ? 't13' : ($m['age'] === 'T16' ? 't16' : 't18')) }}">{{ $m['age'] }}</span>
                    </div>
                    <div class="cv-card-badges-br">
                        <span class="badge-access {{ $m['access'] }}">{{ $m['access'] === 'premium' ? 'VIP' : ($m['access'] === 'rental' ? 'Thuê' : 'Free') }}</span>
                    </div>
                    <div class="cv-card-body">
                        <div class="cv-card-title">{{ $m['title'] }}</div>
                        <div class="cv-card-meta">{{ $m['year'] }} · {{ $m['genre'] }}</div>
                    </div>
                </a>
                @endforeach
            </div>
            <button class="cv-shelf-btn next" aria-label="Cuộn phải"><i class="bi bi-chevron-right"></i></button>
        </div>
    </section>

</div>
{{-- /Related Shelves --}}


@endsection

@section('scripts')
<script>
// ---- Detail page tabs ----
(function(){
    var tabBtns = document.querySelectorAll('.cv-detail-tab-btn');
    var panels  = document.querySelectorAll('.cv-tab-panel');

    tabBtns.forEach(function(btn){
        btn.addEventListener('click', function(){
            var target = this.getAttribute('data-tab');

            tabBtns.forEach(function(b){ b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
            this.classList.add('active');
            this.setAttribute('aria-selected','true');

            panels.forEach(function(p){ p.style.display = 'none'; });
            var panel = document.getElementById('tab-' + target);
            if(panel) panel.style.display = 'block';
        });
    });
})();
</script>
@endsection
