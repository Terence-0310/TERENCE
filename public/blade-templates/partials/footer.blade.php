{{-- ============================================================
     PARTIAL: partials/footer.blade.php
     Site-wide footer - shared across all pages
============================================================ --}}

<style>
    /* ---- Footer ---- */
    .cv-footer {
        background: var(--cv-bg-card);
        border-top: 1px solid var(--cv-border);
        padding: 48px 0 0;
        margin-top: 60px;
    }
    .cv-footer-logo {
        display: inline-flex; align-items: center; gap: 8px;
        font-size: 20px; font-weight: 900; color: #fff;
        letter-spacing: -.5px; text-decoration: none; margin-bottom: 14px;
    }
    .cv-footer-logo-icon {
        width: 28px; height: 28px; background: var(--cv-purple);
        border-radius: 7px; display: flex; align-items: center; justify-content: center;
        font-size: 14px; color: #fff;
    }
    .cv-footer-tagline {
        font-size: 13px; color: var(--cv-text-muted); line-height: 1.6; margin-bottom: 18px;
    }
    .cv-footer-socials {
        display: flex; gap: 8px;
    }
    .cv-footer-social-btn {
        width: 34px; height: 34px; border-radius: 8px;
        background: var(--cv-bg-surface); border: 1px solid var(--cv-border);
        color: var(--cv-text-secondary); display: flex; align-items: center; justify-content: center;
        font-size: 15px; transition: background .2s, color .2s, border-color .2s;
    }
    .cv-footer-social-btn:hover { background: var(--cv-purple); border-color: var(--cv-purple); color: #fff; }

    .cv-footer-col-title {
        font-size: 12px; font-weight: 700; letter-spacing: 1.2px;
        text-transform: uppercase; color: var(--cv-text-muted);
        margin-bottom: 14px;
    }
    .cv-footer-links {
        list-style: none; margin: 0; padding: 0;
    }
    .cv-footer-links li { margin-bottom: 9px; }
    .cv-footer-links a {
        font-size: 13px; color: var(--cv-text-secondary);
        transition: color .18s;
    }
    .cv-footer-links a:hover { color: var(--cv-accent); }

    .cv-footer-app-badges {
        display: flex; flex-direction: column; gap: 8px;
    }
    .cv-footer-app-badge {
        display: flex; align-items: center; gap: 10px;
        background: var(--cv-bg-surface); border: 1px solid var(--cv-border);
        border-radius: 8px; padding: 7px 14px;
        font-size: 12px; color: var(--cv-text-primary);
        transition: border-color .2s;
    }
    .cv-footer-app-badge:hover { border-color: var(--cv-purple); color: var(--cv-text-primary); }
    .cv-footer-app-badge i { font-size: 20px; color: var(--cv-text-secondary); }
    .cv-footer-app-badge .app-label { font-size: 10px; color: var(--cv-text-muted); display: block; line-height: 1; }
    .cv-footer-app-badge .app-name  { font-size: 13px; font-weight: 600; display: block; }

    .cv-footer-ratings {
        display: flex; gap: 6px; flex-wrap: wrap; margin-top: 16px;
    }
    .cv-footer-rating-badge {
        background: var(--cv-bg-surface); border: 1px solid var(--cv-border);
        border-radius: 6px; padding: 4px 10px;
        font-size: 11px; font-weight: 600; color: var(--cv-text-secondary);
    }

    .cv-footer-bottom {
        border-top: 1px solid var(--cv-border);
        padding: 18px 0;
        margin-top: 40px;
        display: flex; align-items: center; justify-content: space-between;
        flex-wrap: wrap; gap: 10px;
    }
    .cv-footer-copyright { font-size: 12px; color: var(--cv-text-muted); }
    .cv-footer-legal {
        display: flex; gap: 18px; list-style: none; margin: 0; padding: 0;
    }
    .cv-footer-legal a { font-size: 12px; color: var(--cv-text-muted); }
    .cv-footer-legal a:hover { color: var(--cv-accent); }

    @media (max-width: 767.98px) {
        .cv-footer { padding: 32px 0 0; }
        .cv-footer-bottom { flex-direction: column; text-align: center; }
        .cv-footer-legal { flex-wrap: wrap; justify-content: center; }
    }
</style>

<!-- Footer -->
<footer class="cv-footer" role="contentinfo">
    <div class="container">
        <div class="row g-5">

            {{-- Brand Column --}}
            <div class="col-lg-3 col-md-6">
                <a href="{{ url('/') }}" class="cv-footer-logo" aria-label="CinéViet">
                    <div class="cv-footer-logo-icon"><i class="bi bi-play-fill"></i></div>
                    Ciné<span style="color:var(--cv-accent)">Viet</span>
                </a>
                <p class="cv-footer-tagline">
                    Nền tảng xem phim trực tuyến hàng đầu Việt Nam.<br>
                    Hàng nghìn bộ phim HD, thuyết minh và phụ đề tiếng Việt.
                </p>
                <div class="cv-footer-socials">
                    <a href="#" class="cv-footer-social-btn" aria-label="Facebook"><i class="bi bi-facebook"></i></a>
                    <a href="#" class="cv-footer-social-btn" aria-label="YouTube"><i class="bi bi-youtube"></i></a>
                    <a href="#" class="cv-footer-social-btn" aria-label="TikTok"><i class="bi bi-tiktok"></i></a>
                    <a href="#" class="cv-footer-social-btn" aria-label="Instagram"><i class="bi bi-instagram"></i></a>
                    <a href="#" class="cv-footer-social-btn" aria-label="Zalo"><i class="bi bi-chat-fill"></i></a>
                </div>
                <div class="cv-footer-ratings">
                    <span class="cv-footer-rating-badge">4.7 <i class="bi bi-star-fill" style="color:var(--cv-gold);font-size:10px"></i> App Store</span>
                    <span class="cv-footer-rating-badge">4.6 <i class="bi bi-star-fill" style="color:var(--cv-gold);font-size:10px"></i> Google Play</span>
                </div>
            </div>

            {{-- Explore Links --}}
            <div class="col-lg-2 col-md-3 col-6">
                <p class="cv-footer-col-title">Khám phá</p>
                <ul class="cv-footer-links">
                    <li><a href="{{ url('/browse') }}">Kho phim</a></li>
                    <li><a href="{{ url('/phim-dien-anh') }}">Phim điện ảnh</a></li>
                    <li><a href="{{ url('/phim-bo') }}">Phim bộ</a></li>
                    <li><a href="{{ url('/phim-thue') }}">Phim thuê</a></li>
                    <li><a href="{{ url('/mien-phi') }}">Xem miễn phí</a></li>
                    <li><a href="{{ url('/khuyen-mai') }}" style="color:var(--cv-gold)">Khuyến mãi</a></li>
                    <li><a href="{{ url('/the-loai') }}">Thể loại</a></li>
                    <li><a href="{{ url('/quoc-gia') }}">Quốc gia</a></li>
                </ul>
            </div>

            {{-- Support Links --}}
            <div class="col-lg-2 col-md-3 col-6">
                <p class="cv-footer-col-title">Hỗ trợ</p>
                <ul class="cv-footer-links">
                    <li><a href="{{ url('/ho-tro') }}">Trung tâm hỗ trợ</a></li>
                    <li><a href="{{ url('/ho-tro/bao-loi') }}">Báo lỗi phát sinh</a></li>
                    <li><a href="{{ url('/ho-tro/thanh-toan') }}">Hướng dẫn thanh toán</a></li>
                    <li><a href="{{ url('/lien-he') }}">Liên hệ</a></li>
                    <li><a href="{{ url('/blog') }}">Blog</a></li>
                    <li><a href="{{ url('/dieu-khoan') }}">Điều khoản sử dụng</a></li>
                    <li><a href="{{ url('/chinh-sach') }}">Chính sách bảo mật</a></li>
                    <li><a href="{{ url('/gioi-thieu') }}">Giới thiệu</a></li>
                </ul>
            </div>

            {{-- Subscription Tiers --}}
            <div class="col-lg-2 col-md-4 col-6">
                <p class="cv-footer-col-title">Gói dịch vụ</p>
                <ul class="cv-footer-links">
                    <li>
                        <a href="{{ url('/goi-dang-ky') }}" style="color:var(--cv-accent)">
                            <i class="bi bi-gem" style="font-size:11px;margin-right:4px"></i>Premium
                        </a>
                    </li>
                    <li><a href="{{ url('/goi-dang-ky') }}">Gói Tháng</a></li>
                    <li><a href="{{ url('/goi-dang-ky') }}">Gói Năm</a></li>
                    <li><a href="{{ url('/phim-thue') }}">Phim thuê lẻ</a></li>
                    <li><a href="{{ url('/mien-phi') }}">Gói miễn phí</a></li>
                    <li><a href="{{ url('/goi-gia-dinh') }}">Gói gia đình</a></li>
                </ul>
            </div>

            {{-- App Downloads --}}
            <div class="col-lg-3 col-md-4 col-6">
                <p class="cv-footer-col-title">Tải ứng dụng</p>
                <div class="cv-footer-app-badges">
                    <a href="#" class="cv-footer-app-badge">
                        <i class="bi bi-apple"></i>
                        <div>
                            <span class="app-label">Tải trên</span>
                            <span class="app-name">App Store</span>
                        </div>
                    </a>
                    <a href="#" class="cv-footer-app-badge">
                        <i class="bi bi-google-play"></i>
                        <div>
                            <span class="app-label">Tải trên</span>
                            <span class="app-name">Google Play</span>
                        </div>
                    </a>
                    <a href="#" class="cv-footer-app-badge">
                        <i class="bi bi-tv"></i>
                        <div>
                            <span class="app-label">Xem trên</span>
                            <span class="app-name">Smart TV</span>
                        </div>
                    </a>
                </div>
            </div>

        </div><!-- /row -->

        {{-- Footer Bottom --}}
        <div class="cv-footer-bottom">
            <p class="cv-footer-copyright">
                &copy; {{ date('Y') }} CinéViet. Bản quyền thuộc về CinéViet JSC.
                Giấy phép ĐKKD số 0123456789 do Sở KHĐT Hà Nội cấp.
            </p>
            <ul class="cv-footer-legal">
                <li><a href="{{ url('/dieu-khoan') }}">Điều khoản</a></li>
                <li><a href="{{ url('/chinh-sach') }}">Bảo mật</a></li>
                <li><a href="{{ url('/cookie') }}">Cookie</a></li>
                <li><a href="{{ url('/sitemap.xml') }}">Sitemap</a></li>
            </ul>
        </div>

    </div><!-- /container -->
</footer>
