{{-- ============================================================
     VIEW: resources/views/browse.blade.php
     Route: /browse
     Layout: layouts.app
============================================================ --}}

@extends('layouts.app')

@section('title', 'Kho Phim - CinéViet')

@section('head_styles')
<style>
    /* ============================================
       BROWSE PAGE STYLES
    ============================================ */

    /* ---- Hero Carousel ---- */
    .cv-hero { position: relative; width: 100%; overflow: hidden; background: #000; }
    .cv-hero-slide {
        position: relative; width: 100%;
        height: clamp(420px, 56vw, 680px);
        overflow: hidden;
    }
    .cv-hero-bg {
        position: absolute; inset: 0;
        background-size: cover; background-position: center top;
        transform: scale(1.04); transition: transform 8s ease;
    }
    .cv-hero-slide.active .cv-hero-bg { transform: scale(1); }
    .cv-hero-overlay-left {
        position: absolute; inset: 0;
        background: linear-gradient(to right, rgba(10,10,15,1) 0%, rgba(10,10,15,.8) 30%, rgba(10,10,15,.3) 60%, transparent 100%);
    }
    .cv-hero-overlay-bottom {
        position: absolute; inset: 0;
        background: linear-gradient(to top, rgba(10,10,15,1) 0%, transparent 55%);
    }
    .cv-hero-content {
        position: absolute; bottom: 0; left: 0; right: 0;
        padding: 0 0 56px 0;
    }
    .cv-hero-eyebrow {
        font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
        color: var(--cv-accent); font-weight: 700; margin-bottom: 10px;
        display: flex; align-items: center; gap: 8px;
    }
    .cv-hero-eyebrow::before {
        content: ''; display: block;
        width: 30px; height: 2px; background: var(--cv-accent);
    }
    .cv-hero-title {
        font-size: clamp(28px, 4.5vw, 52px); font-weight: 900;
        line-height: 1.1; margin-bottom: 10px;
        text-shadow: 0 2px 20px rgba(0,0,0,.6);
    }
    .cv-hero-subtitle {
        font-size: 15px; color: var(--cv-text-secondary);
        font-style: italic; margin-bottom: 12px;
    }
    .cv-hero-meta {
        display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        margin-bottom: 14px;
    }
    .cv-hero-meta span { font-size: 12px; color: var(--cv-text-secondary); }
    .cv-hero-meta .dot { width: 3px; height: 3px; border-radius: 50%; background: var(--cv-text-muted); }
    .cv-hero-desc {
        font-size: 14px; color: var(--cv-text-secondary); line-height: 1.6;
        max-width: 520px; margin-bottom: 22px;
        display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
    }
    .cv-hero-actions { display: flex; gap: 12px; flex-wrap: wrap; }

    /* Hero Controls */
    .cv-hero-controls {
        position: absolute; bottom: 28px; right: 32px;
        display: flex; align-items: center; gap: 10px; z-index: 10;
    }
    .cv-hero-ctrl-btn {
        width: 36px; height: 36px; border-radius: 50%;
        background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.2);
        color: #fff; display: flex; align-items: center; justify-content: center;
        cursor: pointer; font-size: 16px; transition: background .2s;
    }
    .cv-hero-ctrl-btn:hover { background: var(--cv-purple); border-color: var(--cv-purple); }
    .cv-hero-dots {
        display: flex; gap: 6px; align-items: center;
    }
    .cv-hero-dot {
        width: 6px; height: 6px; border-radius: 3px;
        background: rgba(255,255,255,.3); cursor: pointer;
        transition: width .3s, background .3s;
    }
    .cv-hero-dot.active { width: 22px; background: var(--cv-purple); }

    /* ---- Genre Filter ---- */
    .cv-genre-filter {
        display: flex; gap: 8px; overflow-x: auto; padding: 18px 0 14px;
        scrollbar-width: none;
    }
    .cv-genre-filter::-webkit-scrollbar { display: none; }
    .cv-genre-pill {
        background: var(--cv-bg-surface); border: 1px solid var(--cv-border);
        color: var(--cv-text-secondary); padding: 6px 14px; border-radius: 20px;
        font-size: 12px; font-weight: 500; white-space: nowrap; cursor: pointer;
        transition: background .18s, border-color .18s, color .18s;
    }
    .cv-genre-pill:hover, .cv-genre-pill.active {
        background: var(--cv-purple-dim); border-color: var(--cv-purple);
        color: var(--cv-accent);
    }

    /* ---- Trending Badge ---- */
    .cv-trending-num {
        position: absolute; bottom: 0; left: -6px;
        font-size: 56px; font-weight: 900; line-height: 1;
        color: var(--cv-bg-dark);
        -webkit-text-stroke: 2px var(--cv-border);
        z-index: 2; pointer-events: none;
        font-style: italic;
    }

    /* ---- Special shelf: wide cards ---- */
    .cv-shelf-track.wide-cards .cv-card { width: 240px; min-width: 240px; }
    .cv-shelf-track.wide-cards .cv-card-poster { aspect-ratio: 16/9; }

    /* ---- Platform exclusive badge ---- */
    .badge-exclusive {
        background: linear-gradient(135deg, #7c3aed, #c026d3);
        color: #fff; font-size: 9px; font-weight: 700;
        padding: 2px 6px; border-radius: 3px; letter-spacing: .5px;
        text-transform: uppercase;
    }
</style>
@endsection

@section('content')

{{-- ============================================================
     Browse Hero - Featured Content Carousel
============================================================ --}}
<section class="cv-hero" aria-label="Phim nổi bật">

    {{-- Slide 1 --}}
    <div class="cv-hero-slide active" id="heroSlide0">
        <div class="cv-hero-bg" style="background-image: url('https://picsum.photos/seed/hero1/1920/900')"></div>
        <div class="cv-hero-overlay-left"></div>
        <div class="cv-hero-overlay-bottom"></div>
        <div class="cv-hero-content">
            <div class="container">
                <div class="row">
                    <div class="col-lg-7 col-xl-6">
                        <p class="cv-hero-eyebrow">Phim mới ra mắt</p>
                        <h1 class="cv-hero-title">Bóng Tối Cuối Đường</h1>
                        <p class="cv-hero-subtitle">Shadow at the End of the Road</p>
                        <div class="cv-hero-meta">
                            <span class="badge-age t16">T16</span>
                            <span class="badge-access premium">Premium</span>
                            <span class="badge-quality">4K HDR</span>
                            <span class="dot"></span>
                            <span>2024</span>
                            <span class="dot"></span>
                            <span>118 phút</span>
                            <span class="dot"></span>
                            <span>Hành động · Hình sự</span>
                        </div>
                        <p class="cv-hero-desc">
                            Thám tử Minh Khoa bị cuốn vào một vụ mất tích bí ẩn tại Sài Gòn, nơi đường ranh giữa tội phạm và luật pháp mờ dần theo từng đêm tối. Một bí mật từ quá khứ dần hé lộ, thay đổi tất cả những gì anh tưởng là sự thật.
                        </p>
                        <div class="cv-hero-actions">
                            <a href="{{ url('/watch/bong-toi-cuoi-duong') }}" class="btn-cv-primary">
                                <i class="bi bi-play-fill"></i> Xem ngay
                            </a>
                            <a href="{{ url('/phim-thue/bong-toi-cuoi-duong') }}" class="btn-cv-outline">
                                <i class="bi bi-bag"></i> Thuê phim
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    {{-- Slide 2 --}}
    <div class="cv-hero-slide" id="heroSlide1" style="display:none">
        <div class="cv-hero-bg" style="background-image: url('https://picsum.photos/seed/hero2/1920/900')"></div>
        <div class="cv-hero-overlay-left"></div>
        <div class="cv-hero-overlay-bottom"></div>
        <div class="cv-hero-content">
            <div class="container">
                <div class="row">
                    <div class="col-lg-7 col-xl-6">
                        <p class="cv-hero-eyebrow">Phim bộ độc quyền</p>
                        <h1 class="cv-hero-title">Triều Đại Bóng Tối</h1>
                        <p class="cv-hero-subtitle">Dynasty of Shadows</p>
                        <div class="cv-hero-meta">
                            <span class="badge-age t18">T18</span>
                            <span class="badge-access premium">Premium</span>
                            <span class="badge-quality">Full HD</span>
                            <span class="dot"></span>
                            <span>2024</span>
                            <span class="dot"></span>
                            <span>32 tập</span>
                            <span class="dot"></span>
                            <span>Lịch sử · Cổ trang</span>
                        </div>
                        <p class="cv-hero-desc">
                            Giữa triều đình hỗn loạn, vị hoàng tử thứ ba phải chọn giữa lòng trung thành và sự sống còn. Bộ phim dã sử hoành tráng nhất năm với 32 tập đầy kịch tính và tráng lệ.
                        </p>
                        <div class="cv-hero-actions">
                            <a href="{{ url('/watch/trieu-dai-bong-toi') }}" class="btn-cv-primary">
                                <i class="bi bi-play-fill"></i> Xem ngay
                            </a>
                            <a href="{{ url('/movie/trieu-dai-bong-toi') }}" class="btn-cv-outline">
                                <i class="bi bi-info-circle"></i> Chi tiết
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    {{-- Slide 3 --}}
    <div class="cv-hero-slide" id="heroSlide2" style="display:none">
        <div class="cv-hero-bg" style="background-image: url('https://picsum.photos/seed/hero3/1920/900')"></div>
        <div class="cv-hero-overlay-left"></div>
        <div class="cv-hero-overlay-bottom"></div>
        <div class="cv-hero-content">
            <div class="container">
                <div class="row">
                    <div class="col-lg-7 col-xl-6">
                        <p class="cv-hero-eyebrow">Phim không mất phí</p>
                        <h1 class="cv-hero-title">Mùa Hè Xanh Biếc</h1>
                        <p class="cv-hero-subtitle">The Green Summer</p>
                        <div class="cv-hero-meta">
                            <span class="badge-age p">P</span>
                            <span class="badge-access free">Miễn phí</span>
                            <span class="badge-quality">HD</span>
                            <span class="dot"></span>
                            <span>2023</span>
                            <span class="dot"></span>
                            <span>105 phút</span>
                            <span class="dot"></span>
                            <span>Tình cảm · Gia đình</span>
                        </div>
                        <p class="cv-hero-desc">
                            Ba đứa trẻ mồ côi cùng nhau trải qua một mùa hè đặc biệt tại vùng biển miền Trung, khám phá tình bạn, ước mơ và ý nghĩa của gia đình trong câu chuyện cảm động nhất năm.
                        </p>
                        <div class="cv-hero-actions">
                            <a href="{{ url('/watch/mua-he-xanh-biec') }}" class="btn-cv-primary">
                                <i class="bi bi-play-fill"></i> Xem ngay miễn phí
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    {{-- Hero Navigation Controls --}}
    <div class="cv-hero-controls">
        <button class="cv-hero-ctrl-btn" id="heroPrev" aria-label="Slide trước"><i class="bi bi-chevron-left"></i></button>
        <div class="cv-hero-dots" role="tablist" aria-label="Hero slides">
            <button class="cv-hero-dot active" data-slide="0" role="tab" aria-label="Slide 1"></button>
            <button class="cv-hero-dot" data-slide="1" role="tab" aria-label="Slide 2"></button>
            <button class="cv-hero-dot" data-slide="2" role="tab" aria-label="Slide 3"></button>
        </div>
        <button class="cv-hero-ctrl-btn" id="heroNext" aria-label="Slide tiếp theo"><i class="bi bi-chevron-right"></i></button>
    </div>

</section>
{{-- /Browse Hero --}}


{{-- ============================================================
     Browse Main Content
============================================================ --}}
<div class="container-fluid px-3 px-lg-4">

    {{-- Genre Filter Bar --}}
    <div class="cv-genre-filter" role="navigation" aria-label="Lọc theo thể loại">
        <button class="cv-genre-pill active">Tất cả</button>
        <button class="cv-genre-pill">Hành động</button>
        <button class="cv-genre-pill">Tình cảm</button>
        <button class="cv-genre-pill">Hài hước</button>
        <button class="cv-genre-pill">Kinh dị</button>
        <button class="cv-genre-pill">Tâm lý</button>
        <button class="cv-genre-pill">Cổ trang</button>
        <button class="cv-genre-pill">Khoa học viễn tưởng</button>
        <button class="cv-genre-pill">Hoạt hình</button>
        <button class="cv-genre-pill">Tài liệu</button>
        <button class="cv-genre-pill">Thể thao</button>
        <button class="cv-genre-pill">Gia đình</button>
        <button class="cv-genre-pill">Hình sự</button>
        <button class="cv-genre-pill">Phiêu lưu</button>
    </div>

    <hr class="cv-divider mt-1">


    {{-- ============================================================
         Browse Shelf: Phim mới thịnh hành
    ============================================================ --}}
    {{-- Browse Shelf --}}
    <section class="cv-shelf" aria-label="Phim mới thịnh hành">
        <div class="cv-shelf-header">
            <h2 class="cv-shelf-title">Phim mới thịnh hành</h2>
            <a href="{{ url('/browse?sort=trending') }}" class="cv-shelf-see-all">Xem tất cả <i class="bi bi-chevron-right"></i></a>
        </div>
        <div class="cv-shelf-track-wrap">
            <button class="cv-shelf-btn prev" aria-label="Cuộn trái"><i class="bi bi-chevron-left"></i></button>
            <div class="cv-shelf-track" id="shelf-trending">

                @php
                $trendingMovies = [
                    ['title'=>'Kẻ Lừa Đảo Cuối Cùng','year'=>2024,'genre'=>'Hình sự','age'=>'T16','access'=>'premium','quality'=>'4K','seed'=>'mv1'],
                    ['title'=>'Ngọn Lửa Hoàng Hôn','year'=>2024,'genre'=>'Hành động','age'=>'T16','access'=>'premium','quality'=>'4K','seed'=>'mv2'],
                    ['title'=>'Bí Mật Gia Tộc','year'=>2024,'genre'=>'Tâm lý','age'=>'T13','access'=>'premium','quality'=>'HD','seed'=>'mv3'],
                    ['title'=>'Trò Chơi Sinh Tử','year'=>2024,'genre'=>'Kinh dị','age'=>'T18','access'=>'rental','quality'=>'HD','seed'=>'mv4'],
                    ['title'=>'Tiếng Vọng Núi Rừng','year'=>2023,'genre'=>'Phiêu lưu','age'=>'P','access'=>'free','quality'=>'HD','seed'=>'mv5'],
                    ['title'=>'Đêm Sài Gòn Không Ngủ','year'=>2024,'genre'=>'Tình cảm','age'=>'T13','access'=>'premium','quality'=>'4K','seed'=>'mv6'],
                    ['title'=>'Chiến Binh Cuối Cùng','year'=>2024,'genre'=>'Hành động','age'=>'T18','access'=>'premium','quality'=>'4K','seed'=>'mv7'],
                    ['title'=>'Mưa Tháng Ba','year'=>2023,'genre'=>'Tình cảm','age'=>'P','access'=>'free','quality'=>'HD','seed'=>'mv8'],
                    ['title'=>'Vương Triều Lửa','year'=>2024,'genre'=>'Cổ trang','age'=>'T16','access'=>'rental','quality'=>'4K','seed'=>'mv9'],
                    ['title'=>'Hồ Sơ Tuyệt Mật','year'=>2024,'genre'=>'Hình sự','age'=>'T16','access'=>'premium','quality'=>'HD','seed'=>'mv10'],
                    ['title'=>'Ánh Sao Cuối Trời','year'=>2023,'genre'=>'Tình cảm','age'=>'T13','access'=>'free','quality'=>'HD','seed'=>'mv11'],
                    ['title'=>'Linh Hồn Bất Tử','year'=>2024,'genre'=>'Kinh dị','age'=>'T18','access'=>'premium','quality'=>'4K','seed'=>'mv12'],
                ];
                @endphp

                @foreach($trendingMovies as $movie)
                <a href="{{ url('/movie/'.Str::slug($movie['title'])) }}" class="cv-card" aria-label="{{ $movie['title'] }}">
                    <img src="https://picsum.photos/seed/{{ $movie['seed'] }}/280/420"
                         alt="{{ $movie['title'] }}" class="cv-card-poster" loading="lazy">
                    <div class="cv-card-overlay"></div>
                    <div class="cv-card-play"><i class="bi bi-play-fill"></i></div>
                    <div class="cv-card-badges">
                        <span class="badge-age {{ $movie['age'] === 'P' ? 'p' : ($movie['age'] === 'T13' ? 't13' : ($movie['age'] === 'T16' ? 't16' : 't18')) }}">{{ $movie['age'] }}</span>
                    </div>
                    <div class="cv-card-badges-br">
                        <span class="badge-access {{ $movie['access'] }}">{{ $movie['access'] === 'premium' ? 'VIP' : ($movie['access'] === 'rental' ? 'Thuê' : 'Free') }}</span>
                    </div>
                    <div class="cv-card-body">
                        <div class="cv-card-title">{{ $movie['title'] }}</div>
                        <div class="cv-card-meta">{{ $movie['year'] }} · {{ $movie['genre'] }} · {{ $movie['quality'] }}</div>
                    </div>
                </a>
                @endforeach

            </div>
            <button class="cv-shelf-btn next" aria-label="Cuộn phải"><i class="bi bi-chevron-right"></i></button>
        </div>
    </section>


    {{-- ============================================================
         Browse Shelf: Chỉ có trên nền tảng (Exclusives - wide cards)
    ============================================================ --}}
    {{-- Browse Shelf --}}
    <section class="cv-shelf" aria-label="Chỉ có trên CinéViet">
        <div class="cv-shelf-header">
            <h2 class="cv-shelf-title">
                Chỉ có trên CinéViet
                <span class="badge-exclusive ms-2">Độc quyền</span>
            </h2>
            <a href="{{ url('/browse?filter=exclusive') }}" class="cv-shelf-see-all">Xem tất cả <i class="bi bi-chevron-right"></i></a>
        </div>
        <div class="cv-shelf-track-wrap">
            <button class="cv-shelf-btn prev" aria-label="Cuộn trái"><i class="bi bi-chevron-left"></i></button>
            <div class="cv-shelf-track wide-cards" id="shelf-exclusive">

                @php
                $exclusives = [
                    ['title'=>'Triều Đại Bóng Tối','type'=>'Phim bộ · 32 tập','seed'=>'ex1'],
                    ['title'=>'Thành Phố Bí Ẩn','type'=>'Phim điện ảnh · 130 phút','seed'=>'ex2'],
                    ['title'=>'Nữ Hoàng Bóng Đêm','type'=>'Phim bộ · 24 tập','seed'=>'ex3'],
                    ['title'=>'Người Gác Rừng','type'=>'Phim điện ảnh · 110 phút','seed'=>'ex4'],
                    ['title'=>'Đảo Sinh Tử','type'=>'Phim bộ · 16 tập','seed'=>'ex5'],
                    ['title'=>'Huyết Chiến Đèo Ngang','type'=>'Phim điện ảnh · 142 phút','seed'=>'ex6'],
                ];
                @endphp

                @foreach($exclusives as $item)
                <a href="{{ url('/movie/'.Str::slug($item['title'])) }}" class="cv-card" aria-label="{{ $item['title'] }}">
                    <img src="https://picsum.photos/seed/{{ $item['seed'] }}/480/270"
                         alt="{{ $item['title'] }}" class="cv-card-poster" loading="lazy">
                    <div class="cv-card-overlay"></div>
                    <div class="cv-card-play"><i class="bi bi-play-fill"></i></div>
                    <div class="cv-card-badges">
                        <span class="badge-exclusive">Độc quyền</span>
                    </div>
                    <div class="cv-card-badges-br">
                        <span class="badge-access premium">VIP</span>
                    </div>
                    <div class="cv-card-body">
                        <div class="cv-card-title">{{ $item['title'] }}</div>
                        <div class="cv-card-meta">{{ $item['type'] }}</div>
                    </div>
                </a>
                @endforeach

            </div>
            <button class="cv-shelf-btn next" aria-label="Cuộn phải"><i class="bi bi-chevron-right"></i></button>
        </div>
    </section>


    {{-- ============================================================
         Promo Banner Strip
    ============================================================ --}}
    <div class="row g-3 mb-4">
        <div class="col-md-8">
            <div class="position-relative rounded-cv overflow-hidden" style="height:120px; background: linear-gradient(135deg, #4c1d95, #7c3aed, #9d5cf0)">
                <div class="position-absolute" style="right:-20px;top:-20px;font-size:120px;opacity:.08;line-height:1">
                    <i class="bi bi-gem"></i>
                </div>
                <div class="p-4 d-flex align-items-center h-100 gap-4">
                    <div>
                        <p class="mb-1 fw-bold" style="font-size:17px;color:#fff">Nâng cấp Premium ngay</p>
                        <p class="mb-0" style="font-size:12px;color:rgba(255,255,255,.7)">Xem không giới hạn &mdash; 4K · HDR · Không quảng cáo</p>
                    </div>
                    <a href="{{ url('/goi-dang-ky') }}" class="btn-cv-ghost ms-auto flex-shrink-0" style="background:rgba(255,255,255,.15);color:#fff">
                        <i class="bi bi-lightning-fill"></i> Đăng ký ngay
                    </a>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="position-relative rounded-cv overflow-hidden" style="height:120px; background: linear-gradient(135deg, #92400e, #d97706)">
                <div class="p-4 d-flex align-items-center h-100 gap-3">
                    <div>
                        <p class="mb-1 fw-bold" style="font-size:15px;color:#fff">Phim mới mỗi tuần</p>
                        <p class="mb-0" style="font-size:12px;color:rgba(255,255,255,.75)">Thuê phim từ 19.000đ</p>
                    </div>
                    <a href="{{ url('/phim-thue') }}" class="btn-cv-ghost ms-auto flex-shrink-0" style="background:rgba(255,255,255,.15);color:#fff;font-size:13px">
                        Xem ngay
                    </a>
                </div>
            </div>
        </div>
    </div>


    {{-- ============================================================
         Browse Shelf: Phim điện ảnh nổi bật
    ============================================================ --}}
    {{-- Browse Shelf --}}
    <section class="cv-shelf" aria-label="Phim điện ảnh nổi bật">
        <div class="cv-shelf-header">
            <h2 class="cv-shelf-title">Phim điện ảnh nổi bật</h2>
            <a href="{{ url('/phim-dien-anh') }}" class="cv-shelf-see-all">Xem tất cả <i class="bi bi-chevron-right"></i></a>
        </div>
        <div class="cv-shelf-track-wrap">
            <button class="cv-shelf-btn prev" aria-label="Cuộn trái"><i class="bi bi-chevron-left"></i></button>
            <div class="cv-shelf-track" id="shelf-cinema">
                @php
                $cinemaMovies = [
                    ['title'=>'Bóng Tối Cuối Đường','year'=>2024,'genre'=>'Hành động','age'=>'T16','access'=>'rental','seed'=>'c1'],
                    ['title'=>'Huyết Chiến Đèo Ngang','year'=>2024,'genre'=>'Lịch sử','age'=>'T16','access'=>'premium','seed'=>'c2'],
                    ['title'=>'Tình Yêu Và Bóng Tối','year'=>2024,'genre'=>'Tình cảm','age'=>'T13','access'=>'rental','seed'=>'c3'],
                    ['title'=>'Siêu Nhân Đại Dương','year'=>2024,'genre'=>'Hành động','age'=>'P','access'=>'rental','seed'=>'c4'],
                    ['title'=>'Lãng Du Thiên Hà','year'=>2023,'genre'=>'Khoa học VT','age'=>'P','access'=>'free','seed'=>'c5'],
                    ['title'=>'Kẻ Vô Danh','year'=>2024,'genre'=>'Hình sự','age'=>'T18','access'=>'rental','seed'=>'c6'],
                    ['title'=>'Ngàn Trùng Xa Cách','year'=>2023,'genre'=>'Tình cảm','age'=>'T13','access'=>'premium','seed'=>'c7'],
                    ['title'=>'Đại Chiến Thiên Đường','year'=>2024,'genre'=>'Hành động','age'=>'T16','access'=>'rental','seed'=>'c8'],
                    ['title'=>'Mặt Nạ Vàng','year'=>2024,'genre'=>'Hình sự','age'=>'T16','access'=>'premium','seed'=>'c9'],
                    ['title'=>'Nàng Tiên Cá Biển Đông','year'=>2023,'genre'=>'Kỳ ảo','age'=>'P','access'=>'free','seed'=>'c10'],
                ];
                @endphp

                @foreach($cinemaMovies as $movie)
                <a href="{{ url('/movie/'.Str::slug($movie['title'])) }}" class="cv-card" aria-label="{{ $movie['title'] }}">
                    <img src="https://picsum.photos/seed/{{ $movie['seed'] }}/280/420"
                         alt="{{ $movie['title'] }}" class="cv-card-poster" loading="lazy">
                    <div class="cv-card-overlay"></div>
                    <div class="cv-card-play"><i class="bi bi-play-fill"></i></div>
                    <div class="cv-card-badges">
                        <span class="badge-age {{ $movie['age'] === 'P' ? 'p' : ($movie['age'] === 'T13' ? 't13' : ($movie['age'] === 'T16' ? 't16' : 't18')) }}">{{ $movie['age'] }}</span>
                    </div>
                    <div class="cv-card-badges-br">
                        <span class="badge-access {{ $movie['access'] }}">{{ $movie['access'] === 'premium' ? 'VIP' : ($movie['access'] === 'rental' ? 'Thuê' : 'Free') }}</span>
                    </div>
                    <div class="cv-card-body">
                        <div class="cv-card-title">{{ $movie['title'] }}</div>
                        <div class="cv-card-meta">{{ $movie['year'] }} · {{ $movie['genre'] }}</div>
                    </div>
                </a>
                @endforeach

            </div>
            <button class="cv-shelf-btn next" aria-label="Cuộn phải"><i class="bi bi-chevron-right"></i></button>
        </div>
    </section>


    {{-- ============================================================
         Browse Shelf: Phim bộ hot
    ============================================================ --}}
    {{-- Browse Shelf --}}
    <section class="cv-shelf" aria-label="Phim bộ hot">
        <div class="cv-shelf-header">
            <h2 class="cv-shelf-title">Phim bộ hot</h2>
            <a href="{{ url('/phim-bo') }}" class="cv-shelf-see-all">Xem tất cả <i class="bi bi-chevron-right"></i></a>
        </div>
        <div class="cv-shelf-track-wrap">
            <button class="cv-shelf-btn prev" aria-label="Cuộn trái"><i class="bi bi-chevron-left"></i></button>
            <div class="cv-shelf-track" id="shelf-series">
                @php
                $seriesItems = [
                    ['title'=>'Triều Đại Bóng Tối','eps'=>32,'genre'=>'Cổ trang','age'=>'T18','access'=>'premium','seed'=>'s1'],
                    ['title'=>'Nữ Hoàng Bóng Đêm','eps'=>24,'genre'=>'Hình sự','age'=>'T18','access'=>'premium','seed'=>'s2'],
                    ['title'=>'Gia Tộc Danh Gia','eps'=>48,'genre'=>'Gia đình','age'=>'T13','access'=>'premium','seed'=>'s3'],
                    ['title'=>'Vùng Đất Hứa','eps'=>20,'genre'=>'Phiêu lưu','age'=>'T16','access'=>'premium','seed'=>'s4'],
                    ['title'=>'Yêu Lại Từ Đầu','eps'=>36,'genre'=>'Tình cảm','age'=>'T13','access'=>'free','seed'=>'s5'],
                    ['title'=>'Bộ Tứ Huyền Thoại','eps'=>16,'genre'=>'Hành động','age'=>'T16','access'=>'premium','seed'=>'s6'],
                    ['title'=>'Cạm Bẫy Đêm Khuya','eps'=>28,'genre'=>'Hình sự','age'=>'T18','access'=>'premium','seed'=>'s7'],
                    ['title'=>'Hoa Nở Muộn','eps'=>40,'genre'=>'Tình cảm','age'=>'T13','access'=>'free','seed'=>'s8'],
                    ['title'=>'Đảo Sinh Tử','eps'=>16,'genre'=>'Hành động','age'=>'T16','access'=>'premium','seed'=>'s9'],
                    ['title'=>'Mặt Trận Không Tiếng Súng','eps'=>22,'genre'=>'Chiến tranh','age'=>'T16','access'=>'free','seed'=>'s10'],
                ];
                @endphp

                @foreach($seriesItems as $series)
                <a href="{{ url('/movie/'.Str::slug($series['title'])) }}" class="cv-card" aria-label="{{ $series['title'] }}">
                    <img src="https://picsum.photos/seed/{{ $series['seed'] }}/280/420"
                         alt="{{ $series['title'] }}" class="cv-card-poster" loading="lazy">
                    <div class="cv-card-overlay"></div>
                    <div class="cv-card-play"><i class="bi bi-play-fill"></i></div>
                    <div class="cv-card-badges">
                        <span class="badge-age {{ $series['age'] === 'T13' ? 't13' : ($series['age'] === 'T16' ? 't16' : 't18') }}">{{ $series['age'] }}</span>
                    </div>
                    <div class="cv-card-badges-br">
                        <span class="badge-access {{ $series['access'] }}">{{ $series['access'] === 'premium' ? 'VIP' : 'Free' }}</span>
                    </div>
                    <div class="cv-card-body">
                        <div class="cv-card-title">{{ $series['title'] }}</div>
                        <div class="cv-card-meta">{{ $series['eps'] }} tập · {{ $series['genre'] }}</div>
                    </div>
                </a>
                @endforeach

            </div>
            <button class="cv-shelf-btn next" aria-label="Cuộn phải"><i class="bi bi-chevron-right"></i></button>
        </div>
    </section>


    {{-- ============================================================
         Browse Shelf: Phim thuê đặc sắc
    ============================================================ --}}
    {{-- Browse Shelf --}}
    <section class="cv-shelf" aria-label="Phim thuê đặc sắc">
        <div class="cv-shelf-header">
            <h2 class="cv-shelf-title">
                Phim thuê đặc sắc
                <span class="badge-access rental ms-2" style="font-size:10px;padding:2px 7px">Thuê lẻ</span>
            </h2>
            <a href="{{ url('/phim-thue') }}" class="cv-shelf-see-all">Xem tất cả <i class="bi bi-chevron-right"></i></a>
        </div>
        <div class="cv-shelf-track-wrap">
            <button class="cv-shelf-btn prev" aria-label="Cuộn trái"><i class="bi bi-chevron-left"></i></button>
            <div class="cv-shelf-track" id="shelf-rental">
                @php
                $rentalMovies = [
                    ['title'=>'Trò Chơi Sinh Tử','price'=>'39.000đ','genre'=>'Kinh dị','age'=>'T18','seed'=>'r1'],
                    ['title'=>'Vương Triều Lửa','price'=>'29.000đ','genre'=>'Cổ trang','age'=>'T16','seed'=>'r2'],
                    ['title'=>'Kẻ Vô Danh','price'=>'39.000đ','genre'=>'Hình sự','age'=>'T18','seed'=>'r3'],
                    ['title'=>'Siêu Nhân Đại Dương','price'=>'19.000đ','genre'=>'Hành động','age'=>'P','seed'=>'r4'],
                    ['title'=>'Huyết Chiến Đèo Ngang','price'=>'29.000đ','genre'=>'Lịch sử','age'=>'T16','seed'=>'r5'],
                    ['title'=>'Đại Chiến Thiên Đường','price'=>'39.000đ','genre'=>'Hành động','age'=>'T16','seed'=>'r6'],
                    ['title'=>'Mặt Nạ Vàng','price'=>'29.000đ','genre'=>'Hình sự','age'=>'T16','seed'=>'r7'],
                    ['title'=>'Bóng Tối Cuối Đường','price'=>'39.000đ','genre'=>'Hành động','age'=>'T16','seed'=>'r8'],
                ];
                @endphp

                @foreach($rentalMovies as $movie)
                <a href="{{ url('/movie/'.Str::slug($movie['title'])) }}" class="cv-card" aria-label="{{ $movie['title'] }}">
                    <img src="https://picsum.photos/seed/{{ $movie['seed'] }}/280/420"
                         alt="{{ $movie['title'] }}" class="cv-card-poster" loading="lazy">
                    <div class="cv-card-overlay"></div>
                    <div class="cv-card-play"><i class="bi bi-play-fill"></i></div>
                    <div class="cv-card-badges">
                        <span class="badge-age {{ $movie['age'] === 'P' ? 'p' : ($movie['age'] === 'T16' ? 't16' : 't18') }}">{{ $movie['age'] }}</span>
                    </div>
                    <div class="cv-card-badges-br">
                        <span class="badge-access rental">{{ $movie['price'] }}</span>
                    </div>
                    <div class="cv-card-body">
                        <div class="cv-card-title">{{ $movie['title'] }}</div>
                        <div class="cv-card-meta">Thuê · {{ $movie['genre'] }}</div>
                    </div>
                </a>
                @endforeach

            </div>
            <button class="cv-shelf-btn next" aria-label="Cuộn phải"><i class="bi bi-chevron-right"></i></button>
        </div>
    </section>


    {{-- ============================================================
         Browse Shelf: Miễn phí cho bạn
    ============================================================ --}}
    {{-- Browse Shelf --}}
    <section class="cv-shelf" aria-label="Miễn phí cho bạn">
        <div class="cv-shelf-header">
            <h2 class="cv-shelf-title">
                Miễn phí cho bạn
                <span class="badge-access free ms-2" style="font-size:10px;padding:2px 7px">Free</span>
            </h2>
            <a href="{{ url('/mien-phi') }}" class="cv-shelf-see-all">Xem tất cả <i class="bi bi-chevron-right"></i></a>
        </div>
        <div class="cv-shelf-track-wrap">
            <button class="cv-shelf-btn prev" aria-label="Cuộn trái"><i class="bi bi-chevron-left"></i></button>
            <div class="cv-shelf-track" id="shelf-free">
                @php
                $freeMovies = [
                    ['title'=>'Mùa Hè Xanh Biếc','year'=>2023,'genre'=>'Gia đình','age'=>'P','seed'=>'f1'],
                    ['title'=>'Tiếng Vọng Núi Rừng','year'=>2023,'genre'=>'Phiêu lưu','age'=>'P','seed'=>'f2'],
                    ['title'=>'Mưa Tháng Ba','year'=>2023,'genre'=>'Tình cảm','age'=>'P','seed'=>'f3'],
                    ['title'=>'Lãng Du Thiên Hà','year'=>2023,'genre'=>'Khoa học VT','age'=>'P','seed'=>'f4'],
                    ['title'=>'Ánh Sao Cuối Trời','year'=>2023,'genre'=>'Tình cảm','age'=>'T13','seed'=>'f5'],
                    ['title'=>'Yêu Lại Từ Đầu','year'=>2022,'genre'=>'Tình cảm','age'=>'T13','seed'=>'f6'],
                    ['title'=>'Hoa Nở Muộn','year'=>2022,'genre'=>'Tình cảm','age'=>'T13','seed'=>'f7'],
                    ['title'=>'Mặt Trận Không Tiếng Súng','year'=>2022,'genre'=>'Chiến tranh','age'=>'T16','seed'=>'f8'],
                    ['title'=>'Nàng Tiên Cá Biển Đông','year'=>2023,'genre'=>'Kỳ ảo','age'=>'P','seed'=>'f9'],
                    ['title'=>'Người Thầy Cuối Cùng','year'=>2022,'genre'=>'Tâm lý','age'=>'P','seed'=>'f10'],
                ];
                @endphp

                @foreach($freeMovies as $movie)
                <a href="{{ url('/movie/'.Str::slug($movie['title'])) }}" class="cv-card" aria-label="{{ $movie['title'] }}">
                    <img src="https://picsum.photos/seed/{{ $movie['seed'] }}/280/420"
                         alt="{{ $movie['title'] }}" class="cv-card-poster" loading="lazy">
                    <div class="cv-card-overlay"></div>
                    <div class="cv-card-play"><i class="bi bi-play-fill"></i></div>
                    <div class="cv-card-badges">
                        <span class="badge-age {{ $movie['age'] === 'P' ? 'p' : ($movie['age'] === 'T13' ? 't13' : 't16') }}">{{ $movie['age'] }}</span>
                    </div>
                    <div class="cv-card-badges-br">
                        <span class="badge-access free">Free</span>
                    </div>
                    <div class="cv-card-body">
                        <div class="cv-card-title">{{ $movie['title'] }}</div>
                        <div class="cv-card-meta">{{ $movie['year'] }} · {{ $movie['genre'] }}</div>
                    </div>
                </a>
                @endforeach

            </div>
            <button class="cv-shelf-btn next" aria-label="Cuộn phải"><i class="bi bi-chevron-right"></i></button>
        </div>
    </section>


    {{-- ============================================================
         Browse Shelf: Xem nhiều nhất (numbered trending)
    ============================================================ --}}
    {{-- Browse Shelf --}}
    <section class="cv-shelf" aria-label="Xem nhiều nhất tuần này">
        <div class="cv-shelf-header">
            <h2 class="cv-shelf-title">Xem nhiều nhất tuần này</h2>
            <a href="{{ url('/browse?sort=most-watched') }}" class="cv-shelf-see-all">Xem tất cả <i class="bi bi-chevron-right"></i></a>
        </div>
        <div class="cv-shelf-track-wrap">
            <button class="cv-shelf-btn prev" aria-label="Cuộn trái"><i class="bi bi-chevron-left"></i></button>
            <div class="cv-shelf-track" id="shelf-most-watched" style="padding-bottom: 12px; padding-left: 12px;">
                @php
                $topMovies = [
                    ['title'=>'Triều Đại Bóng Tối','access'=>'premium','seed'=>'top1'],
                    ['title'=>'Bóng Tối Cuối Đường','access'=>'rental','seed'=>'top2'],
                    ['title'=>'Yêu Lại Từ Đầu','access'=>'free','seed'=>'top3'],
                    ['title'=>'Kẻ Lừa Đảo Cuối Cùng','access'=>'premium','seed'=>'top4'],
                    ['title'=>'Nữ Hoàng Bóng Đêm','access'=>'premium','seed'=>'top5'],
                    ['title'=>'Đảo Sinh Tử','access'=>'premium','seed'=>'top6'],
                    ['title'=>'Vương Triều Lửa','access'=>'rental','seed'=>'top7'],
                    ['title'=>'Hoa Nở Muộn','access'=>'free','seed'=>'top8'],
                    ['title'=>'Mùa Hè Xanh Biếc','access'=>'free','seed'=>'top9'],
                    ['title'=>'Gia Tộc Danh Gia','access'=>'premium','seed'=>'top10'],
                ];
                @endphp

                @foreach($topMovies as $i => $movie)
                <a href="{{ url('/movie/'.Str::slug($movie['title'])) }}" class="cv-card" style="margin-left: 28px;" aria-label="{{ $i+1 }}. {{ $movie['title'] }}">
                    <div class="cv-trending-num">{{ $i + 1 }}</div>
                    <img src="https://picsum.photos/seed/{{ $movie['seed'] }}/280/420"
                         alt="{{ $movie['title'] }}" class="cv-card-poster" loading="lazy">
                    <div class="cv-card-overlay"></div>
                    <div class="cv-card-play"><i class="bi bi-play-fill"></i></div>
                    <div class="cv-card-badges-br">
                        <span class="badge-access {{ $movie['access'] }}">{{ $movie['access'] === 'premium' ? 'VIP' : ($movie['access'] === 'rental' ? 'Thuê' : 'Free') }}</span>
                    </div>
                    <div class="cv-card-body">
                        <div class="cv-card-title">{{ $movie['title'] }}</div>
                    </div>
                </a>
                @endforeach

            </div>
            <button class="cv-shelf-btn next" aria-label="Cuộn phải"><i class="bi bi-chevron-right"></i></button>
        </div>
    </section>


    {{-- ============================================================
         Browse Shelf: Gợi ý hôm nay
    ============================================================ --}}
    {{-- Browse Shelf --}}
    <section class="cv-shelf" aria-label="Gợi ý hôm nay">
        <div class="cv-shelf-header">
            <h2 class="cv-shelf-title">Gợi ý hôm nay</h2>
            <a href="{{ url('/browse?sort=recommended') }}" class="cv-shelf-see-all">Xem tất cả <i class="bi bi-chevron-right"></i></a>
        </div>
        <div class="cv-shelf-track-wrap">
            <button class="cv-shelf-btn prev" aria-label="Cuộn trái"><i class="bi bi-chevron-left"></i></button>
            <div class="cv-shelf-track" id="shelf-recommended">
                @php
                $recommended = [
                    ['title'=>'Chiến Binh Cuối Cùng','year'=>2024,'genre'=>'Hành động','age'=>'T18','access'=>'premium','seed'=>'rec1'],
                    ['title'=>'Bí Mật Gia Tộc','year'=>2024,'genre'=>'Tâm lý','age'=>'T13','access'=>'premium','seed'=>'rec2'],
                    ['title'=>'Hồ Sơ Tuyệt Mật','year'=>2024,'genre'=>'Hình sự','age'=>'T16','access'=>'premium','seed'=>'rec3'],
                    ['title'=>'Ngọn Lửa Hoàng Hôn','year'=>2024,'genre'=>'Hành động','age'=>'T16','access'=>'premium','seed'=>'rec4'],
                    ['title'=>'Đêm Sài Gòn Không Ngủ','year'=>2024,'genre'=>'Tình cảm','age'=>'T13','access'=>'premium','seed'=>'rec5'],
                    ['title'=>'Linh Hồn Bất Tử','year'=>2024,'genre'=>'Kinh dị','age'=>'T18','access'=>'premium','seed'=>'rec6'],
                    ['title'=>'Người Gác Rừng','year'=>2024,'genre'=>'Phiêu lưu','age'=>'T13','access'=>'premium','seed'=>'rec7'],
                    ['title'=>'Thành Phố Bí Ẩn','year'=>2024,'genre'=>'Hình sự','age'=>'T16','access'=>'rental','seed'=>'rec8'],
                    ['title'=>'Tình Yêu Và Bóng Tối','year'=>2024,'genre'=>'Tình cảm','age'=>'T13','access'=>'rental','seed'=>'rec9'],
                    ['title'=>'Cạm Bẫy Đêm Khuya','year'=>2024,'genre'=>'Hình sự','age'=>'T18','access'=>'premium','seed'=>'rec10'],
                    ['title'=>'Vùng Đất Hứa','year'=>2024,'genre'=>'Phiêu lưu','age'=>'T16','access'=>'premium','seed'=>'rec11'],
                    ['title'=>'Mặt Nạ Vàng','year'=>2024,'genre'=>'Hình sự','age'=>'T16','access'=>'premium','seed'=>'rec12'],
                ];
                @endphp

                @foreach($recommended as $movie)
                <a href="{{ url('/movie/'.Str::slug($movie['title'])) }}" class="cv-card" aria-label="{{ $movie['title'] }}">
                    <img src="https://picsum.photos/seed/{{ $movie['seed'] }}/280/420"
                         alt="{{ $movie['title'] }}" class="cv-card-poster" loading="lazy">
                    <div class="cv-card-overlay"></div>
                    <div class="cv-card-play"><i class="bi bi-play-fill"></i></div>
                    <div class="cv-card-badges">
                        <span class="badge-age {{ $movie['age'] === 'T13' ? 't13' : ($movie['age'] === 'T16' ? 't16' : 't18') }}">{{ $movie['age'] }}</span>
                    </div>
                    <div class="cv-card-badges-br">
                        <span class="badge-access {{ $movie['access'] }}">{{ $movie['access'] === 'premium' ? 'VIP' : ($movie['access'] === 'rental' ? 'Thuê' : 'Free') }}</span>
                    </div>
                    <div class="cv-card-body">
                        <div class="cv-card-title">{{ $movie['title'] }}</div>
                        <div class="cv-card-meta">{{ $movie['year'] }} · {{ $movie['genre'] }}</div>
                    </div>
                </a>
                @endforeach

            </div>
            <button class="cv-shelf-btn next" aria-label="Cuộn phải"><i class="bi bi-chevron-right"></i></button>
        </div>
    </section>

</div>
{{-- /Browse Main Content --}}


@endsection

@section('scripts')
<script>
// ---- Hero carousel ----
(function(){
    var slides = document.querySelectorAll('.cv-hero-slide');
    var dots   = document.querySelectorAll('.cv-hero-dot');
    var current = 0;
    var timer;

    function showSlide(n) {
        slides[current].style.display = 'none';
        slides[current].classList.remove('active');
        dots[current].classList.remove('active');
        current = (n + slides.length) % slides.length;
        slides[current].style.display = 'block';
        slides[current].classList.add('active');
        dots[current].classList.add('active');
    }

    function startAuto() {
        timer = setInterval(function(){ showSlide(current + 1); }, 5500);
    }

    function resetAuto() {
        clearInterval(timer); startAuto();
    }

    document.getElementById('heroPrev').addEventListener('click', function(){ showSlide(current - 1); resetAuto(); });
    document.getElementById('heroNext').addEventListener('click', function(){ showSlide(current + 1); resetAuto(); });
    dots.forEach(function(dot, i){
        dot.addEventListener('click', function(){ showSlide(i); resetAuto(); });
    });

    // Genre filter pills
    document.querySelectorAll('.cv-genre-pill').forEach(function(pill){
        pill.addEventListener('click', function(){
            document.querySelectorAll('.cv-genre-pill').forEach(function(p){ p.classList.remove('active'); });
            this.classList.add('active');
        });
    });

    startAuto();
})();
</script>
@endsection
