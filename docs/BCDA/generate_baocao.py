# -*- coding: utf-8 -*-
"""
Generate báo cáo đồ án TERENCE theo mẫu Nhom3_WebsiteHoTroThietKeGiaoDienFrontend.docx
"""

from docx import Document
from docx.shared import Pt, Cm, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement


# ----------------------------- Helpers ----------------------------- #

def set_cell_border(cell, **kwargs):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for edge in ('top', 'left', 'bottom', 'right'):
        if edge in kwargs:
            border = OxmlElement(f'w:{edge}')
            border.set(qn('w:val'), 'single')
            border.set(qn('w:sz'), '4')
            border.set(qn('w:color'), '000000')
            tcBorders.append(border)
    tcPr.append(tcBorders)


def add_paragraph(doc, text='', bold=False, italic=False, size=13,
                  align=WD_ALIGN_PARAGRAPH.JUSTIFY, color=None,
                  font_name='Times New Roman', indent_first=0.0, space_after=6):
    p = doc.add_paragraph()
    p.alignment = align
    pf = p.paragraph_format
    if indent_first:
        pf.first_line_indent = Cm(indent_first)
    pf.space_after = Pt(space_after)
    pf.line_spacing = 1.5
    if text:
        run = p.add_run(text)
        run.bold = bold
        run.italic = italic
        run.font.name = font_name
        run.font.size = Pt(size)
        if color:
            run.font.color.rgb = color
        r = run._element
        rPr = r.get_or_add_rPr()
        rFonts = rPr.find(qn('w:rFonts'))
        if rFonts is None:
            rFonts = OxmlElement('w:rFonts')
            rPr.append(rFonts)
        rFonts.set(qn('w:ascii'), font_name)
        rFonts.set(qn('w:hAnsi'), font_name)
        rFonts.set(qn('w:cs'), font_name)
    return p


def add_heading_custom(doc, text, level=1, color=None):
    sizes = {0: 22, 1: 18, 2: 15, 3: 14}
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT if level > 0 else WD_ALIGN_PARAGRAPH.CENTER
    pf = p.paragraph_format
    pf.space_before = Pt(12)
    pf.space_after = Pt(8)
    pf.line_spacing = 1.5
    pf.keep_with_next = True
    run = p.add_run(text)
    run.bold = True
    run.font.name = 'Times New Roman'
    run.font.size = Pt(sizes.get(level, 13))
    if color:
        run.font.color.rgb = color
    else:
        run.font.color.rgb = RGBColor(0x00, 0x00, 0x00)
    r = run._element
    rPr = r.get_or_add_rPr()
    rFonts = OxmlElement('w:rFonts')
    rFonts.set(qn('w:ascii'), 'Times New Roman')
    rFonts.set(qn('w:hAnsi'), 'Times New Roman')
    rPr.append(rFonts)
    # Outline level for TOC
    pPr = p._p.get_or_add_pPr()
    outlineLvl = OxmlElement('w:outlineLvl')
    outlineLvl.set(qn('w:val'), str(level))
    pPr.append(outlineLvl)
    return p


def add_image_placeholder(doc, caption):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(f'[CHÈN HÌNH: {caption}]')
    run.italic = True
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    run.font.color.rgb = RGBColor(0x80, 0x80, 0x80)

    cap = doc.add_paragraph()
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.paragraph_format.space_after = Pt(12)
    cr = cap.add_run(caption)
    cr.italic = True
    cr.font.name = 'Times New Roman'
    cr.font.size = Pt(12)


def add_table_data(doc, headers, rows, col_widths=None):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = 'Light Grid Accent 1'
    table.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Header
    hdr = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr[i].text = ''
        p = hdr[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(h)
        run.bold = True
        run.font.name = 'Times New Roman'
        run.font.size = Pt(12)
        hdr[i].vertical_alignment = WD_ALIGN_VERTICAL.CENTER

    # Rows
    for ri, row_data in enumerate(rows, start=1):
        cells = table.rows[ri].cells
        for ci, val in enumerate(row_data):
            cells[ci].text = ''
            p = cells[ci].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            run = p.add_run(str(val))
            run.font.name = 'Times New Roman'
            run.font.size = Pt(12)
            cells[ci].vertical_alignment = WD_ALIGN_VERTICAL.CENTER

    if col_widths:
        for row in table.rows:
            for i, w in enumerate(col_widths):
                row.cells[i].width = Cm(w)

    # Spacing after table
    doc.add_paragraph()
    return table


# ----------------------------- Document ----------------------------- #

doc = Document()

# Page setup
section = doc.sections[0]
section.top_margin = Cm(2.0)
section.bottom_margin = Cm(2.0)
section.left_margin = Cm(3.0)
section.right_margin = Cm(2.0)

# Default style
style = doc.styles['Normal']
style.font.name = 'Times New Roman'
style.font.size = Pt(13)
style.paragraph_format.line_spacing = 1.5
style.paragraph_format.space_after = Pt(6)

# ========== TRANG BÌA ==========

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run('BỘ GIÁO DỤC VÀ ĐÀO TẠO')
run.bold = True
run.font.size = Pt(14)
run.font.name = 'Times New Roman'

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run('TRƯỜNG ĐẠI HỌC CÔNG NGHỆ TP. HCM')
run.bold = True
run.font.size = Pt(14)
run.font.name = 'Times New Roman'

for _ in range(2):
    doc.add_paragraph()

add_image_placeholder(doc, 'Logo Trường Đại học HUTECH')

for _ in range(2):
    doc.add_paragraph()

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run('BÁO CÁO ĐỒ ÁN CƠ SỞ')
run.bold = True
run.font.size = Pt(22)
run.font.name = 'Times New Roman'

doc.add_paragraph()

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run('WEBSITE XEM PHIM TRỰC TUYẾN TERENCE')
run.bold = True
run.font.size = Pt(20)
run.font.name = 'Times New Roman'
run.font.color.rgb = RGBColor(0x1F, 0x49, 0x7D)

for _ in range(3):
    doc.add_paragraph()

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run('Ngành: CÔNG NGHỆ THÔNG TIN')
run.bold = True
run.font.size = Pt(14)
run.font.name = 'Times New Roman'

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run('Chuyên ngành: Kỹ thuật phần mềm')
run.bold = True
run.font.size = Pt(14)
run.font.name = 'Times New Roman'

doc.add_paragraph()

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run('Giảng viên hướng dẫn: KS. Dương Quốc Nam')
run.font.size = Pt(14)
run.font.name = 'Times New Roman'

doc.add_paragraph()

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run('Nhóm sinh viên thực hiện:')
run.font.size = Pt(14)
run.font.name = 'Times New Roman'

# Bảng thông tin nhóm
team_table = doc.add_table(rows=4, cols=3)
team_table.alignment = WD_ALIGN_PARAGRAPH.CENTER
hdr = team_table.rows[0].cells
headers_team = ['Họ và tên', 'Lớp', 'MSSV']
team_data = [
    ['Nguyễn Đức Anh Tài', '22DTHC4', '2280600XXX'],
    ['Lê Tấn Tài', '22DTHC4', '2280600XXX'],
    ['Trần Hồng Đức', '22DTHC4', '2280600XXX'],
]
for i, h in enumerate(headers_team):
    hdr[i].text = ''
    p = hdr[i].paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(h)
    run.bold = True
    run.font.name = 'Times New Roman'
    run.font.size = Pt(13)
for ri, row in enumerate(team_data, start=1):
    cells = team_table.rows[ri].cells
    for ci, val in enumerate(row):
        cells[ci].text = ''
        p = cells[ci].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(val)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(13)

for _ in range(3):
    doc.add_paragraph()

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run('TP. Hồ Chí Minh, 2026')
run.bold = True
run.italic = True
run.font.size = Pt(14)
run.font.name = 'Times New Roman'

doc.add_page_break()

# ========== LỜI CẢM ƠN ==========
add_heading_custom(doc, 'LỜI CẢM ƠN', level=0)

loi_cam_on = [
    "Lời đầu tiên, nhóm chúng em xin bày tỏ lòng biết ơn sâu sắc đến KS. Dương Quốc Nam — người đã tận tình hướng dẫn, định hướng tư duy kỹ thuật và hỗ trợ nhóm trong suốt quá trình nghiên cứu, xây dựng và hoàn thiện đề tài đồ án cơ sở với chủ đề xây dựng Website Xem Phim Trực Tuyến TERENCE. Những góp ý chuyên sâu về kiến trúc hệ thống, thiết kế cơ sở dữ liệu và định hướng áp dụng công nghệ hiện đại mà Thầy chia sẻ đã giúp đề tài trở nên hoàn chỉnh và có tính thực tiễn cao.",
    "Chúng em cũng xin gửi lời cảm ơn chân thành đến Ban Giám hiệu và toàn thể Quý Thầy Cô thuộc Khoa Công nghệ Thông tin, Trường Đại học Công nghệ TP. HCM (HUTECH) đã tạo điều kiện thuận lợi về cơ sở vật chất, giáo trình và môi trường học thuật để nhóm có thể thực hiện đề tài một cách nghiêm túc và hiệu quả. Toàn bộ kiến thức được trang bị qua các học phần như Lập trình Web, Cơ sở dữ liệu, Kỹ thuật phần mềm, Mạng máy tính và Hệ điều hành đã là nền tảng trực tiếp để nhóm tiếp cận và giải quyết các bài toán kỹ thuật phức tạp trong quá trình xây dựng hệ thống.",
    "Trong quá trình thực hiện đề tài, nhóm đã không tránh khỏi những lúc gặp khó khăn về mặt kỹ thuật, đặc biệt là khi tích hợp đồng thời nhiều công nghệ mới như Socket.IO cho tính năng Watch Party theo thời gian thực, LiveKit cho giao tiếp âm thanh hình ảnh, HLS.js cho phát video adaptive streaming, hay việc thiết kế pipeline đồng bộ dữ liệu phim từ nguồn OPhim và làm giàu metadata bằng TMDB API. Sự định hướng kịp thời từ Thầy hướng dẫn, cùng tinh thần hợp tác và nỗ lực của từng thành viên trong nhóm, đã giúp chúng em vượt qua mọi trở ngại để hoàn thành đề tài đúng tiến độ.",
    "Mặc dù đã cố gắng hết sức, song đây là lần đầu nhóm tiếp cận một dự án full-stack quy mô lớn với yêu cầu kỹ thuật cao, do đó báo cáo không tránh khỏi một số thiếu sót. Nhóm rất mong nhận được sự nhận xét và góp ý từ Quý Thầy Cô để có thể rút kinh nghiệm và hoàn thiện trong các dự án tiếp theo.",
    "Xin trân trọng cảm ơn!",
]
for para in loi_cam_on:
    add_paragraph(doc, para, indent_first=1.0)

doc.add_paragraph()
p = add_paragraph(doc, 'TP. HCM, ngày ... tháng ... năm 2026', align=WD_ALIGN_PARAGRAPH.RIGHT, italic=True)
p = add_paragraph(doc, 'Nhóm sinh viên thực hiện', align=WD_ALIGN_PARAGRAPH.RIGHT, bold=True)

doc.add_page_break()

# ========== NHẬN XÉT GVHD ==========
add_heading_custom(doc, 'NHẬN XÉT & ĐÁNH GIÁ CỦA GIẢNG VIÊN HƯỚNG DẪN', level=0)

add_paragraph(doc, 'Qua quá trình hướng dẫn nhóm sinh viên thực hiện đồ án cơ sở với đề tài "Website Xem Phim Trực Tuyến TERENCE", giảng viên hướng dẫn có một số nhận xét và đánh giá như sau:')

add_paragraph(doc, '1/ Quá trình học tập và thực hiện:', bold=True)
for _ in range(4):
    add_paragraph(doc, '.' * 90)

add_paragraph(doc, '2/ Thực hiện báo cáo:', bold=True)
for _ in range(4):
    add_paragraph(doc, '.' * 90)

add_paragraph(doc, 'Đánh giá chung:', bold=True)
for _ in range(3):
    add_paragraph(doc, '.' * 90)

add_paragraph(doc, 'Kết quả đạt được:', bold=True)
add_paragraph(doc, 'Điểm đánh giá việc thực hiện báo cáo: ............/10', bold=True)

doc.add_paragraph()
add_paragraph(doc, 'TP. HCM, ngày ... tháng ... năm 2026', align=WD_ALIGN_PARAGRAPH.RIGHT, italic=True)
add_paragraph(doc, 'GIẢNG VIÊN HƯỚNG DẪN', align=WD_ALIGN_PARAGRAPH.RIGHT, bold=True)
for _ in range(3):
    doc.add_paragraph()
add_paragraph(doc, 'KS. Dương Quốc Nam', align=WD_ALIGN_PARAGRAPH.RIGHT, bold=True)

doc.add_page_break()

# ========== MỤC LỤC (placeholder) ==========
add_heading_custom(doc, 'MỤC LỤC', level=0)
add_paragraph(doc, '[CẬP NHẬT MỤC LỤC TỰ ĐỘNG: References → Table of Contents trong Word]', italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, color=RGBColor(0x80, 0x80, 0x80))

# Add a TOC field
paragraph = doc.add_paragraph()
run = paragraph.add_run()
fldChar1 = OxmlElement('w:fldChar')
fldChar1.set(qn('w:fldCharType'), 'begin')
instrText = OxmlElement('w:instrText')
instrText.set(qn('xml:space'), 'preserve')
instrText.text = 'TOC \\o "1-3" \\h \\z \\u'
fldChar2 = OxmlElement('w:fldChar')
fldChar2.set(qn('w:fldCharType'), 'separate')
fldChar3 = OxmlElement('w:t')
fldChar3.text = "Nhấn F9 hoặc chuột phải → Update Field để hiển thị mục lục."
fldChar4 = OxmlElement('w:fldChar')
fldChar4.set(qn('w:fldCharType'), 'end')
r_element = run._r
r_element.append(fldChar1)
r_element.append(instrText)
r_element.append(fldChar2)
r_element.append(fldChar3)
r_element.append(fldChar4)

doc.add_page_break()

# ========== DANH MỤC HÌNH ẢNH ==========
add_heading_custom(doc, 'DANH MỤC HÌNH ẢNH', level=0)
hinh_anh = [
    ('Hình 1.1', 'Logo Next.js'),
    ('Hình 1.2', 'Logo TypeScript'),
    ('Hình 1.3', 'Logo Tailwind CSS'),
    ('Hình 1.4', 'Logo Prisma ORM'),
    ('Hình 1.5', 'Logo SQLite'),
    ('Hình 1.6', 'Logo Socket.IO'),
    ('Hình 1.7', 'Logo LiveKit'),
    ('Hình 1.8', 'Logo HLS.js'),
    ('Hình 1.9', 'Logo shadcn/ui'),
    ('Hình 1.10', 'Logo Visual Studio Code'),
    ('Hình 2.1', 'Sơ đồ High Level Design của TERENCE'),
    ('Hình 2.2', 'Sơ đồ kiến trúc tổng quan (Architecture Diagram)'),
    ('Hình 2.3', 'Sơ đồ ERD Diagram'),
    ('Hình 2.6.1', 'UseCase tổng quát'),
    ('Hình 2.6.2', 'UseCase Đăng ký / Đăng nhập'),
    ('Hình 2.6.3', 'UseCase Duyệt và xem phim'),
    ('Hình 2.6.4', 'UseCase Watch Party'),
    ('Hình 2.6.5', 'UseCase Đánh giá phim'),
    ('Hình 2.6.6', 'UseCase TCoin'),
    ('Hình 2.6.7', 'UseCase Quản trị Admin'),
    ('Hình 2.7.1', 'Sequence Diagram Đăng ký'),
    ('Hình 2.7.2', 'Sequence Diagram Đăng nhập'),
    ('Hình 2.7.3', 'Sequence Diagram Xem phim'),
    ('Hình 2.7.4', 'Sequence Diagram Tạo Watch Party'),
    ('Hình 2.7.5', 'Sequence Diagram Đồng bộ Watch Party'),
    ('Hình 2.7.6', 'Sequence Diagram Chat Watch Party'),
    ('Hình 2.7.7', 'Sequence Diagram Sync OPhim Pipeline'),
    ('Hình 2.7.8', 'Sequence Diagram TMDB Enrichment'),
    ('Hình 2.7.9', 'Sequence Diagram Đánh giá phim'),
    ('Hình 2.7.10', 'Sequence Diagram Lưu tiến trình xem'),
    ('Hình 2.7.11', 'Sequence Diagram Thanh toán TCoin'),
    ('Hình 3.1', 'Đồ thị quan hệ sau chuẩn hóa'),
    ('Hình 4.1', 'Giao diện trang chủ'),
    ('Hình 4.2', 'Giao diện trang đăng nhập'),
    ('Hình 4.3', 'Giao diện trang đăng ký'),
    ('Hình 4.4', 'Giao diện trang duyệt phim (Browse)'),
    ('Hình 4.5', 'Giao diện trang chi tiết phim'),
    ('Hình 4.6', 'Giao diện trang xem phim (Player)'),
    ('Hình 4.7', 'Giao diện trang Watch Party'),
    ('Hình 4.8', 'Giao diện Watch Party — Chat & Video Call'),
    ('Hình 4.9', 'Giao diện trang Tin tức phim'),
    ('Hình 4.10', 'Giao diện trang Đánh giá phim'),
    ('Hình 4.11', 'Giao diện trang Ví TCoin'),
    ('Hình 4.12', 'Giao diện trang Lịch sử xem'),
    ('Hình 4.13', 'Giao diện trang Profile'),
    ('Hình 4.14', 'Giao diện trang Short Video'),
    ('Hình 4.15', 'Giao diện Admin Dashboard'),
    ('Hình 4.16', 'Giao diện Admin — Quản lý phim'),
    ('Hình 4.17', 'Giao diện Admin — Quản lý người dùng'),
    ('Hình 4.18', 'Giao diện Admin — Duyệt đánh giá'),
    ('Hình 4.19', 'Giao diện Admin — Sync dữ liệu'),
    ('Hình 4.20', 'Giao diện Admin — Audit Log'),
]
for ten, mota in hinh_anh:
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.line_spacing = 1.5
    pf.space_after = Pt(2)
    run = p.add_run(f'{ten}: {mota} ........................................................... ')
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)

doc.add_page_break()

# ========== DANH MỤC BẢNG BIỂU ==========
add_heading_custom(doc, 'DANH MỤC BẢNG BIỂU', level=0)
bang_bieu = [
    ('Bảng 1.1', 'So sánh các nền tảng xem phim trực tuyến hiện nay'),
    ('Bảng 1.2', 'Tóm tắt công nghệ sử dụng trong TERENCE'),
    ('Bảng 2.1', 'Danh sách bảng dữ liệu trong hệ thống'),
    ('Bảng 2.5.1', 'Bảng User'),
    ('Bảng 2.5.2', 'Bảng Session'),
    ('Bảng 2.5.3', 'Bảng Movie'),
    ('Bảng 2.5.4', 'Bảng Episode'),
    ('Bảng 2.5.5', 'Bảng VideoSource'),
    ('Bảng 2.5.6', 'Bảng SubtitleTrack'),
    ('Bảng 2.5.7', 'Bảng Genre'),
    ('Bảng 2.5.8', 'Bảng Country'),
    ('Bảng 2.5.9', 'Bảng Person'),
    ('Bảng 2.5.10', 'Bảng MoviePerson'),
    ('Bảng 2.5.11', 'Bảng WatchHistory'),
    ('Bảng 2.5.12', 'Bảng Favorite'),
    ('Bảng 2.5.13', 'Bảng Review'),
    ('Bảng 2.5.14', 'Bảng Wallet'),
    ('Bảng 2.5.15', 'Bảng WalletTransaction'),
    ('Bảng 2.5.16', 'Bảng PaymentOrder'),
    ('Bảng 2.5.17', 'Bảng WatchPartyRoom'),
    ('Bảng 2.5.18', 'Bảng WatchPartyParticipant'),
    ('Bảng 2.5.19', 'Bảng WatchPartyState'),
    ('Bảng 2.5.20', 'Bảng WatchPartyMessage'),
    ('Bảng 2.5.21', 'Bảng NewsPost'),
    ('Bảng 2.5.22', 'Bảng Short'),
    ('Bảng 2.5.23', 'Bảng AdminLog'),
    ('Bảng 2.5.24', 'Bảng Upload'),
    ('Bảng 2.5.25', 'Bảng PageView'),
    ('Bảng 2.5.26', 'Bảng SyncJob'),
    ('Bảng 2.5.27', 'Bảng SyncLog'),
    ('Bảng 3.1', 'Các phụ thuộc hàm trong hệ thống TERENCE'),
]
for ten, mota in bang_bieu:
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.line_spacing = 1.5
    pf.space_after = Pt(2)
    run = p.add_run(f'{ten}: {mota} ........................................................... ')
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)

doc.add_page_break()

# ========== LỜI MỞ ĐẦU ==========
add_heading_custom(doc, 'LỜI MỞ ĐẦU', level=0)

add_paragraph(doc, 'Lý do chọn đề tài', bold=True, size=14)
add_paragraph(doc,
    "Trong kỷ nguyên số bùng nổ hiện nay, nhu cầu giải trí trực tuyến — đặc biệt là xem phim qua nền tảng web và mobile — đã trở thành một phần không thể thiếu trong đời sống của hàng triệu người dùng. Các nền tảng quốc tế như Netflix, Disney+, HBO Max hay nền tảng nội địa như FPT Play, Galaxy Play đã thiết lập một chuẩn mực mới cho trải nghiệm xem phim: chất lượng hình ảnh cao, gợi ý phim thông minh, đồng bộ thiết bị và đặc biệt là khả năng tương tác xã hội trong khi xem.",
    indent_first=1.0)
add_paragraph(doc,
    "Tuy nhiên, các nền tảng nội địa Việt Nam vẫn còn nhiều hạn chế về mặt công nghệ và trải nghiệm người dùng. Phần lớn các website xem phim hiện nay chỉ tập trung vào việc cung cấp danh sách phim mà chưa đầu tư đúng mức vào kiến trúc full-stack hiện đại, hệ thống đồng bộ dữ liệu tự động, các tính năng xã hội như xem chung thời gian thực, hoặc hệ thống quản trị nội dung chuyên nghiệp. Bên cạnh đó, một số nền tảng còn gặp vấn đề về performance, độ trễ playback, và thiếu các tính năng giúp nâng cao mức độ gắn kết người dùng.",
    indent_first=1.0)
add_paragraph(doc,
    "Nhận thấy đây là một bài toán thực tiễn thú vị và phù hợp với phạm vi của đồ án cơ sở môn Công nghệ phần mềm, nhóm chúng em đã lựa chọn xây dựng \"TERENCE — Website xem phim trực tuyến\". Đề tài cho phép nhóm áp dụng đồng thời nhiều kiến thức đã học: phân tích thiết kế hệ thống, cơ sở dữ liệu, lập trình web full-stack, mạng máy tính (Socket.IO, WebRTC), cũng như được trải nghiệm các công nghệ hiện đại như Next.js 16 App Router, React Server Components, Prisma ORM, HLS adaptive streaming và LiveKit WebRTC. Quan trọng hơn, đề tài giúp nhóm rèn luyện kỹ năng làm việc nhóm theo quy trình phần mềm chuẩn (phân chia công việc, sprint planning, code review, CI/CD).",
    indent_first=1.0)

add_paragraph(doc, 'Mục đích nghiên cứu', bold=True, size=14)
muc_dich = [
    "Xây dựng hoàn chỉnh một website xem phim trực tuyến chất lượng cao, hỗ trợ đa nền tảng (desktop, tablet, mobile) với trải nghiệm người dùng mượt mà.",
    "Áp dụng kiến trúc Modular Monolith và Layered Architecture vào dự án thực tế, đảm bảo tách biệt rõ ràng giữa các tầng Frontend, Backend, Data và Domain.",
    "Tích hợp pipeline đồng bộ dữ liệu tự động từ các nguồn bên ngoài (OPhim, OPhim18) và làm giàu metadata bằng TMDB API.",
    "Phát triển tính năng Watch Party độc đáo — cho phép nhiều người xem chung phim với đồng bộ thời gian thực, chat, voice và video call.",
    "Xây dựng hệ thống quản trị nội dung (CMS) đầy đủ với phân quyền RBAC 5 cấp, audit log và moderation workflow.",
    "Triển khai hệ thống thanh toán TCoin tích hợp cổng SePay, cho phép người dùng nạp tiền và sử dụng dịch vụ premium.",
    "Deploy production thực tế trên VPS với PM2, Nginx, Cloudflare DNS, đảm bảo hệ thống hoạt động ổn định 24/7.",
]
for m in muc_dich:
    p = doc.add_paragraph(style='List Bullet')
    pf = p.paragraph_format
    pf.line_spacing = 1.5
    run = p.add_run(m)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(13)

add_paragraph(doc, 'Ý nghĩa của việc nghiên cứu', bold=True, size=14)
add_paragraph(doc,
    "Đối với người dùng: TERENCE cung cấp một nền tảng xem phim với giao diện hiện đại, kho phim phong phú được cập nhật tự động, trải nghiệm playback mượt mà nhờ HLS adaptive streaming, và tính năng xem chung độc đáo giúp tăng tính kết nối giữa bạn bè, người thân.",
    indent_first=1.0)
add_paragraph(doc,
    "Đối với lập trình viên: Dự án là một ví dụ thực tế đầy đủ về việc xây dựng full-stack application với Next.js 16, Prisma ORM, Socket.IO real-time, WebRTC, và các best practices về kiến trúc phần mềm — có thể được dùng làm tài liệu tham khảo cho các dự án tương tự.",
    indent_first=1.0)
add_paragraph(doc,
    "Đối với nhóm thực hiện: Quá trình xây dựng TERENCE giúp nhóm rèn luyện kỹ năng thiết kế hệ thống quy mô, làm việc nhóm, quản lý dự án theo sprint, sử dụng Git workflow chuyên nghiệp, viết test, deploy production, và đặc biệt là khả năng học và tích hợp công nghệ mới một cách nhanh chóng.",
    indent_first=1.0)

add_paragraph(doc, 'Kết cấu đề tài', bold=True, size=14)
ket_cau = [
    "LỜI MỞ ĐẦU",
    "CHƯƠNG 1: TỔNG QUAN VÀ CƠ SỞ LÝ THUYẾT",
    "CHƯƠNG 2: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG",
    "CHƯƠNG 3: CHUẨN HÓA DỮ LIỆU",
    "CHƯƠNG 4: GIAO DIỆN WEBSITE",
    "CHƯƠNG 5: KẾT LUẬN",
]
for k in ket_cau:
    add_paragraph(doc, k, bold=True, indent_first=1.0)

doc.add_page_break()

# ========== CHƯƠNG 1 ==========
add_heading_custom(doc, 'CHƯƠNG 1: TỔNG QUAN VÀ CƠ SỞ LÝ THUYẾT', level=1, color=RGBColor(0x1F, 0x49, 0x7D))

add_heading_custom(doc, '1.1 KHẢO SÁT HIỆN TRẠNG', level=2)
add_paragraph(doc,
    "Ngành công nghiệp giải trí trực tuyến trên thế giới đã phát triển vượt bậc trong thập kỷ qua. Theo báo cáo của Statista (2025), doanh thu toàn cầu của thị trường video streaming đã vượt 100 tỷ USD và dự kiến tăng trưởng kép 10% mỗi năm. Tại Việt Nam, lượng người dùng các nền tảng OTT (Over-The-Top) như Netflix, FPT Play, Galaxy Play, K+ đã vượt 30 triệu người, chiếm gần một phần ba dân số.",
    indent_first=1.0)
add_paragraph(doc,
    "Tuy vậy, nhiều nền tảng xem phim trong nước vẫn còn tồn đọng nhiều vấn đề: chất lượng video không ổn định do thiếu adaptive streaming, kho phim cập nhật chậm vì phụ thuộc nhập liệu thủ công, trải nghiệm tìm kiếm — lọc phim còn thô sơ, và đặc biệt là thiếu hoàn toàn các tính năng xã hội như xem chung, chat real-time hay voice/video call. Bên cạnh đó, các nền tảng vi phạm bản quyền (movies-only sites) thường có giao diện kém, quảng cáo dày đặc và không tôn trọng dữ liệu người dùng.",
    indent_first=1.0)
add_paragraph(doc,
    "Trong môi trường học thuật, các đề tài đồ án về xem phim trực tuyến thường chỉ dừng ở mức demo CRUD đơn giản, sử dụng PHP/MySQL truyền thống mà chưa đề cập đến các thành tố quan trọng của một hệ thống streaming hiện đại như: HLS adaptive bitrate, real-time synchronization, pipeline đồng bộ dữ liệu, hay deployment production-grade. Vì vậy, TERENCE được xây dựng với mục tiêu vừa giải quyết bài toán thực tế vừa làm tài liệu tham khảo cho sinh viên IT.",
    indent_first=1.0)

add_paragraph(doc, "Bảng 1.1: So sánh các nền tảng xem phim trực tuyến hiện nay", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tiêu chí', 'Netflix', 'FPT Play', 'OPhim/RoPhim', 'TERENCE'],
    rows=[
        ['Adaptive HLS streaming', 'Có', 'Có', 'Hạn chế', 'Có'],
        ['Sync dữ liệu tự động', 'Có (nội bộ)', 'Bán tự động', 'Không', 'Có (OPhim+TMDB)'],
        ['Watch Party real-time', 'Hạn chế', 'Không', 'Không', 'Có (đầy đủ)'],
        ['Voice/Video Call trong phim', 'Không', 'Không', 'Không', 'Có (LiveKit)'],
        ['Quản trị CMS đầy đủ', 'Có', 'Có', 'Không', 'Có'],
        ['Phân quyền RBAC', 'Có', 'Có', 'Không', 'Có (5 roles)'],
        ['Audit log đầy đủ', 'Có', 'Có', 'Không', 'Có'],
        ['TCoin / ví tích lũy', 'Không', 'Có (gói)', 'Không', 'Có'],
        ['Mã nguồn mở học thuật', 'Không', 'Không', 'Không', 'Có'],
    ],
    col_widths=[4.5, 2.5, 2.5, 2.5, 3.0])

add_heading_custom(doc, '1.2 NHIỆM VỤ CỦA VIỆC NGHIÊN CỨU', level=2)
add_paragraph(doc, "Đề tài TERENCE đặt ra các nhiệm vụ nghiên cứu và phát triển cụ thể như sau:", indent_first=1.0)
nhiem_vu = [
    "Khảo sát và phân tích các nền tảng xem phim trực tuyến hiện có để rút ra các điểm mạnh, điểm yếu và cơ hội cải tiến.",
    "Thiết kế cơ sở dữ liệu chuẩn hóa cho hệ thống streaming, hỗ trợ phim đơn / phim bộ / anime / short video, multi-source playback và đa ngôn ngữ.",
    "Xây dựng kiến trúc backend modular monolith với Next.js 16 App Router, Prisma ORM và Socket.IO, dễ mở rộng sang microservice trong tương lai.",
    "Phát triển hệ thống xác thực và phân quyền RBAC 5 cấp (SUPER_ADMIN, ADMIN, STAFF, EDITOR, USER) với session cookie httpOnly an toàn.",
    "Tích hợp pipeline đồng bộ dữ liệu phim tự động từ OPhim/OPhim18 và làm giàu metadata (poster HD, cast, trailer) từ TMDB API v3.",
    "Xây dựng tính năng Watch Party — phòng xem chung real-time với đồng bộ playback, chat, voice và video call qua Socket.IO + LiveKit WebRTC.",
    "Phát triển CMS đầy đủ cho admin: CRUD phim, users, reviews, news, sync trigger, audit log, dashboard analytics.",
    "Triển khai hệ thống TCoin với ví ảo, giao dịch credit/debit và cổng thanh toán SePay.",
    "Tối ưu performance: server-side rendering, lazy loading, image optimization, prisma query selection, Redis caching khi cần.",
    "Triển khai production trên Vultr VPS với PM2 process manager, Nginx reverse proxy + SSL, Cloudflare DNS proxy.",
    "Viết tài liệu kỹ thuật đầy đủ và bộ test Vitest + Postman để đảm bảo chất lượng.",
]
for n in nhiem_vu:
    p = doc.add_paragraph(style='List Bullet')
    pf = p.paragraph_format
    pf.line_spacing = 1.5
    run = p.add_run(n)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(13)

add_heading_custom(doc, '1.3 ĐỐI TƯỢNG VÀ KHÁCH THỂ NGHIÊN CỨU', level=2)
add_paragraph(doc, "Đối tượng nghiên cứu:", bold=True, indent_first=1.0)
add_paragraph(doc, "Hệ thống website xem phim trực tuyến full-stack TERENCE — bao gồm các module: xác thực, danh mục phim, phát video, watch party, đánh giá, tin tức, ví TCoin, quản trị nội dung và pipeline đồng bộ dữ liệu.", indent_first=1.0)
add_paragraph(doc, "Khách thể nghiên cứu:", bold=True, indent_first=1.0)
add_paragraph(doc, "Người dùng cuối có nhu cầu xem phim trực tuyến (cá nhân, nhóm bạn bè), quản trị viên hệ thống nội dung, và lập trình viên muốn tham khảo mô hình kiến trúc full-stack hiện đại.", indent_first=1.0)

add_heading_custom(doc, '1.4 PHƯƠNG PHÁP VÀ PHẠM VI NGHIÊN CỨU', level=2)

add_heading_custom(doc, '1.4.1 Phương pháp nghiên cứu', level=3)
pp = [
    "Phương pháp thu thập tài liệu: Nghiên cứu tài liệu chính thức của Next.js, React, Prisma, Socket.IO, LiveKit, HLS.js, TMDB API, OPhim API; tham khảo sách và bài viết về kiến trúc phần mềm hiện đại (Modular Monolith, Layered Architecture, RBAC).",
    "Phương pháp phân tích hệ thống: Sử dụng UML để mô hình hóa use case, sequence diagram, ERD; áp dụng nguyên tắc SOLID và Clean Architecture trong thiết kế module.",
    "Phương pháp thực nghiệm: Triển khai prototype theo từng sprint 1 tuần, mỗi sprint kết thúc bằng demo và retrospective; kiểm thử thực tế trên môi trường staging và production.",
    "Phương pháp so sánh: So sánh các giải pháp công nghệ (REST vs GraphQL, SQLite vs PostgreSQL, WebSocket vs Server-Sent Events) để chọn phương án tối ưu cho phạm vi đồ án.",
    "Phương pháp làm việc nhóm: Áp dụng quy trình Agile/Scrum rút gọn với daily check-in, weekly demo, code review qua Pull Request, và sử dụng GitHub Issues để tracking công việc.",
]
for x in pp:
    p = doc.add_paragraph(style='List Bullet')
    pf = p.paragraph_format
    pf.line_spacing = 1.5
    run = p.add_run(x)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(13)

add_heading_custom(doc, '1.4.2 Phạm vi nghiên cứu', level=3)
add_paragraph(doc, "Phạm vi về chức năng:", bold=True, indent_first=1.0)
pham_vi_cn = [
    "Người dùng: đăng ký/đăng nhập, duyệt — tìm kiếm — lọc phim, xem phim với HLS, lưu lịch sử xem, đánh giá, watch party, ví TCoin.",
    "Admin: dashboard tổng quan, CRUD phim/episode/genre/country/person, quản lý user/role, duyệt review, sync dữ liệu, audit log, quản lý TCoin.",
    "Hệ thống: pipeline đồng bộ OPhim → TMDB enrichment, real-time sync Watch Party qua Socket.IO, video/voice call qua LiveKit.",
]
for x in pham_vi_cn:
    p = doc.add_paragraph(style='List Bullet')
    pf = p.paragraph_format
    pf.line_spacing = 1.5
    run = p.add_run(x)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(13)

add_paragraph(doc, "Phạm vi về công nghệ:", bold=True, indent_first=1.0)
pham_vi_cn2 = [
    "Frontend: Next.js 16 App Router, React 19, Server Components, Tailwind CSS 4, shadcn/ui, SWR.",
    "Backend: Next.js API Routes, Node.js custom server với Socket.IO, Prisma ORM 6.",
    "Database: SQLite (phase 1) với khả năng migrate sang PostgreSQL khi scale.",
    "Realtime: Socket.IO 4.8 cho chat/sync, LiveKit cho WebRTC voice/video call.",
    "DevOps: Docker, PM2, Nginx, Cloudflare DNS, Vultr VPS.",
]
for x in pham_vi_cn2:
    p = doc.add_paragraph(style='List Bullet')
    pf = p.paragraph_format
    pf.line_spacing = 1.5
    run = p.add_run(x)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(13)

add_paragraph(doc, "Phạm vi về thời gian:", bold=True, indent_first=1.0)
add_paragraph(doc, "Dự án được thực hiện trong 4 tuần (22/03/2026 – 18/04/2026) theo 4 sprint, mỗi sprint 1 tuần, với mục tiêu rõ ràng và deliverable cụ thể.", indent_first=1.0)

# ========== 1.5 Giới thiệu công nghệ ==========
add_heading_custom(doc, '1.5 GIỚI THIỆU NGÔN NGỮ, FRAMEWORK, THƯ VIỆN, NỀN TẢNG', level=2)

tech_stack = [
    ('1.5.1 Next.js 16', 'Logo Next.js',
     "Next.js là framework React full-stack hàng đầu hiện nay, được phát triển và bảo trì bởi Vercel. Phiên bản 16 (2025) đã hoàn thiện kiến trúc App Router với React Server Components (RSC), Server Actions, và Turbopack — engine bundling viết bằng Rust nhanh hơn Webpack tới 700%. "
     "Next.js cho phép render hybrid: SSR (Server-Side Rendering) để SEO tốt, RSC để giảm JavaScript gửi xuống client, CSR (Client-Side Rendering) cho các phần tương tác động. Nó cũng tích hợp sẵn middleware, API routes, image optimization, font optimization, và streaming UI. "
     "Trong dự án TERENCE, chúng em chọn Next.js 16 vì khả năng hỗ trợ đồng thời cả frontend và backend trong cùng một codebase, giúp giảm phức tạp deploy và đồng nhất ngôn ngữ TypeScript xuyên suốt full-stack."),

    ('1.5.2 TypeScript 5.7', 'Logo TypeScript',
     "TypeScript là ngôn ngữ lập trình do Microsoft phát triển từ năm 2012, được xây dựng trên nền JavaScript với hệ thống kiểu tĩnh (static typing) tùy chọn. TypeScript được biên dịch (transpile) sang JavaScript thuần để chạy trên trình duyệt và Node.js. "
     "Phiên bản 5.7 mang đến nhiều cải tiến: type narrowing thông minh hơn, performance compiler nhanh hơn, hỗ trợ ECMAScript decorators v3, và type-only imports. "
     "TypeScript giúp dự án TERENCE phát hiện lỗi tại compile-time thay vì runtime, cải thiện trải nghiệm developer (IntelliSense, refactor an toàn), và làm tài liệu sống cho codebase nhờ type definitions."),

    ('1.5.3 Tailwind CSS 4', 'Logo Tailwind CSS',
     "Tailwind CSS là framework CSS theo hướng utility-first do Adam Wathan và Steve Schoger phát triển từ 2017. Thay vì viết CSS class tùy chỉnh, lập trình viên sử dụng các utility class có sẵn (như `flex`, `p-4`, `text-center`, `bg-blue-500`) trực tiếp trong HTML/JSX. "
     "Phiên bản 4 (2025) viết lại engine bằng Rust (Lightning CSS), cho thời gian build cực nhanh, hỗ trợ container queries, cascade layers và CSS variables tự động. "
     "TERENCE sử dụng Tailwind CSS 4 kết hợp với shadcn/ui để xây dựng UI dark theme nhất quán, responsive trên mọi thiết bị, và dễ dàng customize design tokens."),

    ('1.5.4 Prisma ORM 6', 'Logo Prisma ORM',
     "Prisma là Object-Relational Mapping (ORM) thế hệ mới cho Node.js và TypeScript, được phát triển bởi Prisma Labs. Khác với các ORM truyền thống như Sequelize hay TypeORM, Prisma dùng schema file (`schema.prisma`) làm single source of truth, từ đó tự sinh ra Prisma Client TypeScript-safe. "
     "Prisma 6 hỗ trợ multi-database (PostgreSQL, MySQL, SQLite, SQL Server, MongoDB), migration tự động (`prisma migrate`), Prisma Studio (GUI quản lý DB), và Accelerate connection pooling. "
     "TERENCE chọn Prisma 6 với SQLite làm database chính ở phase đồ án vì setup đơn giản, có thể migrate sang PostgreSQL khi cần scale mà không thay đổi business logic."),

    ('1.5.5 SQLite', 'Logo SQLite',
     "SQLite là hệ quản trị cơ sở dữ liệu quan hệ embedded do D. Richard Hipp phát triển từ năm 2000. SQLite không cần server riêng — toàn bộ database được lưu trong một file `.db` đơn lẻ, hỗ trợ ACID đầy đủ và truy vấn SQL tiêu chuẩn. "
     "SQLite được dùng trong hàng tỉ thiết bị (iOS, Android, Chrome, Firefox, Skype) nhờ tính nhỏ gọn, ổn định và không cần cấu hình. "
     "TERENCE chọn SQLite vì phù hợp với phạm vi đồ án: đơn giản, dễ deploy, không cần quản lý server DB riêng. Schema được thiết kế tương thích PostgreSQL để có thể migrate dễ dàng trong tương lai."),

    ('1.5.6 Socket.IO 4.8', 'Logo Socket.IO',
     "Socket.IO là thư viện JavaScript cho phép giao tiếp hai chiều real-time giữa client và server qua WebSocket (fallback HTTP long-polling khi cần). Socket.IO được phát triển từ 2010, hiện được dùng bởi Microsoft Office, Trello, Zendesk, Bloomberg. "
     "Phiên bản 4.8 hỗ trợ binary data, multiplexing qua namespaces, room broadcasting, ack callbacks, và adapter Redis cho horizontal scaling. "
     "TERENCE dùng Socket.IO để xây dựng tính năng Watch Party: đồng bộ playback (play/pause/seek) giữa Host và Guest, chat real-time, thông báo participant join/leave."),

    ('1.5.7 LiveKit', 'Logo LiveKit',
     "LiveKit là nền tảng WebRTC mã nguồn mở dành cho ứng dụng voice/video call quy mô lớn. LiveKit cung cấp cả self-hosted server (Go-based) lẫn LiveKit Cloud — managed service với hạ tầng SFU (Selective Forwarding Unit) toàn cầu. "
     "LiveKit hỗ trợ data channels, recording, simulcast (gửi nhiều bitrate cùng lúc để adaptive), end-to-end encryption, và SDK cho mọi nền tảng (Web, iOS, Android, React Native, Flutter, Unity). "
     "Trong TERENCE, LiveKit được dùng để bổ sung tính năng voice/video call vào phòng Watch Party, giúp người xem có thể nói chuyện với nhau như đang ngồi cùng phòng."),

    ('1.5.8 HLS.js', 'Logo HLS.js',
     "HLS.js là thư viện JavaScript thuần (không phụ thuộc Flash) cho phép phát stream HTTP Live Streaming (HLS) trên các trình duyệt không hỗ trợ HLS native như Chrome và Firefox. HLS là chuẩn streaming do Apple phát triển, chia video thành các segment `.ts` nhỏ và mô tả qua file `.m3u8` manifest. "
     "HLS.js hỗ trợ adaptive bitrate (tự động chuyển chất lượng theo băng thông), subtitle tracks, DRM, và live streaming. Player UI có thể custom hoàn toàn theo design system của ứng dụng. "
     "TERENCE dùng HLS.js để phát các nguồn video HLS từ OPhim — đảm bảo trải nghiệm playback mượt mà ngay cả khi mạng yếu."),

    ('1.5.9 shadcn/ui + Radix UI', 'Logo shadcn/ui',
     "shadcn/ui là bộ component React UI hiện đại do shadcn phát triển, kết hợp Radix UI primitives (accessibility-first) với Tailwind CSS styling. Khác với UI library truyền thống (chỉ cần install npm), shadcn/ui được copy-paste vào dự án, cho phép tùy chỉnh hoàn toàn. "
     "shadcn/ui cung cấp 50+ components: Button, Input, Dialog, Toast, DropdownMenu, Calendar, DataTable... đều ARIA-compliant và keyboard accessible. "
     "TERENCE sử dụng shadcn/ui làm nền tảng UI để đảm bảo nhất quán design system, accessibility, và dễ maintain."),

    ('1.5.10 Visual Studio Code', 'Logo Visual Studio Code',
     "Visual Studio Code (VS Code) là code editor mã nguồn mở do Microsoft phát triển từ 2015, dựa trên Electron framework. VS Code hỗ trợ hàng nghìn extension qua Marketplace, debugger tích hợp, Git integration, IntelliSense thông minh, và Live Share. "
     "Nhóm TERENCE sử dụng VS Code với các extension thiết yếu: Prisma, ESLint, Prettier, TypeScript, Tailwind CSS IntelliSense, GitLens, REST Client. "
     "VS Code cho phép trải nghiệm phát triển nhất quán giữa các thành viên trong nhóm và tích hợp tốt với GitHub Copilot, Claude Code để tăng năng suất."),
]

for title, image_cap, content in tech_stack:
    add_heading_custom(doc, title, level=3)
    add_image_placeholder(doc, image_cap)
    add_paragraph(doc, content, indent_first=1.0)

doc.add_page_break()

# ========== CHƯƠNG 2 ==========
add_heading_custom(doc, 'CHƯƠNG 2: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG', level=1, color=RGBColor(0x1F, 0x49, 0x7D))

add_heading_custom(doc, '2.1 HIGH LEVEL DESIGN', level=2)
add_paragraph(doc,
    "TERENCE được thiết kế theo mô hình Modular Monolith — toàn bộ ứng dụng được triển khai trong một codebase và một process duy nhất, nhưng được tổ chức thành các module độc lập với ranh giới rõ ràng. Cách tiếp cận này phù hợp với giai đoạn đầu của sản phẩm: dễ phát triển, dễ deploy, dễ debug, nhưng vẫn sẵn sàng tách thành microservice khi traffic tăng cao.",
    indent_first=1.0)
add_paragraph(doc,
    "Hệ thống được chia thành 3 tầng chính: tầng giao diện (Client), tầng máy chủ (Server) và tầng dữ liệu (Data). Mỗi tầng giao tiếp với tầng kế tiếp qua giao diện rõ ràng (Server Component / API Routes / Prisma Client) và không bao giờ vượt cấp.",
    indent_first=1.0)
add_image_placeholder(doc, 'Hình 2.1: Sơ đồ High Level Design của TERENCE')

add_heading_custom(doc, '2.2 KIẾN TRÚC HỆ THỐNG', level=2)
add_paragraph(doc,
    "Trên cơ sở mô hình Modular Monolith, kiến trúc chi tiết của TERENCE được triển khai theo Layered Architecture với 4 tầng:",
    indent_first=1.0)

layers = [
    ('Presentation Layer (FE)', 'Các page và component React trong thư mục `app/` và `src/fe/`. Tầng này chỉ chứa logic hiển thị, nhận dữ liệu qua API và phát sinh sự kiện người dùng.'),
    ('Application Layer (BE Controllers)', 'Các API Route handler trong `app/api/`. Tầng này nhận request, validate input (Zod), gọi service layer và trả response. Không chứa business logic phức tạp.'),
    ('Domain Layer (BE Services)', 'Các module trong `src/be/modules/` (movies, ophim, tmdb, watch-party, auth...). Đây là nơi chứa business logic, gọi repository và xử lý workflow.'),
    ('Data Layer (Prisma)', 'Prisma Client truy cập SQLite. Schema và migrations được quản lý trong `src/dta/prisma/`.'),
]
for layer_name, layer_desc in layers:
    p = doc.add_paragraph(style='List Bullet')
    pf = p.paragraph_format
    pf.line_spacing = 1.5
    run = p.add_run(layer_name + ': ')
    run.bold = True
    run.font.name = 'Times New Roman'
    run.font.size = Pt(13)
    run2 = p.add_run(layer_desc)
    run2.font.name = 'Times New Roman'
    run2.font.size = Pt(13)

add_paragraph(doc,
    "Bên cạnh đó, hệ thống còn tích hợp các thành phần phụ trợ:",
    indent_first=1.0)
phu_tro = [
    "Socket.IO Server: gắn vào custom Node.js server cùng với Next.js, xử lý các sự kiện Watch Party.",
    "External APIs: OPhim API (catalog phim), TMDB API (metadata phim, cast), GNews API (tin tức), SePay (thanh toán), LiveKit Cloud (WebRTC).",
    "Background Pipeline: module `pipeline` thực thi sync OPhim → TMDB enrichment, có tracking qua `SyncJob` và `SyncLog`.",
    "Audit & Analytics: middleware ghi `AdminLog` cho mọi hành động admin, `PageView` cho mọi request người dùng.",
]
for x in phu_tro:
    p = doc.add_paragraph(style='List Bullet')
    pf = p.paragraph_format
    pf.line_spacing = 1.5
    run = p.add_run(x)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(13)

add_image_placeholder(doc, 'Hình 2.2: Sơ đồ kiến trúc tổng quan (Architecture Diagram)')

add_heading_custom(doc, '2.3 MÔ HÌNH ERD DIAGRAM', level=2)
add_paragraph(doc,
    "Mô hình ERD (Entity Relationship Diagram) của TERENCE bao gồm hơn 30 thực thể, được nhóm thành 9 cụm chính: User & Auth, Catalog (phim), Taxonomy, User Interactions, TCoin & Payments, Watch Party, CMS & Content, Admin & Analytics, Sync Pipeline. "
    "Các thực thể được liên kết bởi các quan hệ 1-1, 1-N và N-N (thông qua bảng trung gian). Mọi khóa chính đều dùng `cuid` (collision-resistant unique identifier) thay vì auto-increment integer, giúp dễ phân tán và bảo mật hơn.",
    indent_first=1.0)
add_image_placeholder(doc, 'Hình 2.3: Sơ đồ ERD Diagram tổng quan hệ thống TERENCE')

add_heading_custom(doc, '2.4 MÔ HÌNH ERD CHUYỂN SANG MÔ HÌNH QUAN HỆ', level=2)
add_paragraph(doc, "Chuyển đổi ERD sang mô hình quan hệ tuân theo các nguyên tắc:", indent_first=1.0)
chuyen_doi = [
    "Mỗi entity (thực thể) → một bảng (table) trong cơ sở dữ liệu.",
    "Mỗi attribute (thuộc tính) → một cột (column).",
    "Quan hệ 1-N → khóa ngoại (foreign key) ở bên N.",
    "Quan hệ N-N → bảng trung gian (junction table) như `MovieGenre`, `MovieCountry`, `MoviePerson`, `MovieGenre`.",
    "Khóa chính: dùng `id String @id @default(cuid())` thay vì auto-increment.",
    "Mọi bảng có `createdAt` và `updatedAt` để tracking; các bảng quan trọng (User, Movie) có thêm `deletedAt` cho soft delete.",
]
for x in chuyen_doi:
    p = doc.add_paragraph(style='List Bullet')
    pf = p.paragraph_format
    pf.line_spacing = 1.5
    run = p.add_run(x)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(13)

add_paragraph(doc,
    "Các enum trong Prisma schema (UserRole, MovieType, PublishStatus, ...) được lưu dưới dạng string vì SQLite không hỗ trợ native enum. Việc validate enum value được thực hiện ở tầng application thông qua TypeScript type và Zod validator.",
    indent_first=1.0)

add_heading_custom(doc, '2.5 THIẾT KẾ CÁC BẢNG DỮ LIỆU', level=2)

# 2.5.1 User
add_heading_custom(doc, '2.5.1 Bảng User', level=3)
add_paragraph(doc,
    "Bảng `User` lưu thông tin tài khoản người dùng, hỗ trợ phân quyền RBAC 5 cấp (SUPER_ADMIN, ADMIN, STAFF, EDITOR, USER) và trạng thái (ACTIVE, SUSPENDED, BANNED).",
    indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.1: Bảng thông tin User", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK, cuid', 'Khóa chính'],
        ['name', 'String', 'NOT NULL', 'Tên hiển thị'],
        ['email', 'String', 'UNIQUE, NOT NULL', 'Email đăng nhập'],
        ['passwordHash', 'String', 'NOT NULL', 'Mật khẩu hash bằng bcrypt'],
        ['role', 'Enum', 'DEFAULT "USER"', 'Vai trò RBAC'],
        ['avatar', 'String?', 'NULL', 'URL ảnh đại diện'],
        ['bio', 'String?', 'NULL', 'Giới thiệu bản thân'],
        ['isActive', 'Boolean', 'DEFAULT true', 'Trạng thái hoạt động'],
        ['status', 'Enum', 'DEFAULT "ACTIVE"', 'ACTIVE/SUSPENDED/BANNED'],
        ['blockedReason', 'String?', 'NULL', 'Lý do khóa tài khoản'],
        ['lastLoginAt', 'DateTime?', 'NULL', 'Thời điểm đăng nhập gần nhất'],
        ['lastLoginIp', 'String?', 'NULL', 'IP đăng nhập gần nhất'],
        ['loginCount', 'Int', 'DEFAULT 0', 'Số lần đăng nhập'],
        ['createdAt', 'DateTime', 'NOT NULL', 'Thời điểm tạo'],
        ['updatedAt', 'DateTime', 'NOT NULL', 'Thời điểm cập nhật'],
        ['deletedAt', 'DateTime?', 'NULL', 'Soft delete'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# 2.5.2 Session
add_heading_custom(doc, '2.5.2 Bảng Session', level=3)
add_paragraph(doc, "Bảng `Session` lưu phiên đăng nhập của người dùng, hỗ trợ session cookie httpOnly thời hạn 30 ngày.", indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.2: Bảng thông tin Session", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK, cuid', 'Khóa chính (session token)'],
        ['userId', 'String', 'FK → User.id', 'Người dùng sở hữu'],
        ['expiresAt', 'DateTime', 'NOT NULL', 'Thời điểm hết hạn'],
        ['createdAt', 'DateTime', 'NOT NULL', 'Thời điểm tạo session'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# 2.5.3 Movie
add_heading_custom(doc, '2.5.3 Bảng Movie', level=3)
add_paragraph(doc, "Bảng `Movie` là thực thể trung tâm của hệ thống, lưu thông tin phim với hỗ trợ multi-source và metadata phong phú từ OPhim + TMDB.", indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.3: Bảng thông tin Movie", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK, cuid', 'Khóa chính'],
        ['ophimId', 'String?', 'UNIQUE', 'ID từ OPhim'],
        ['tmdbId', 'Int?', 'UNIQUE', 'ID từ TMDB'],
        ['imdbId', 'String?', 'NULL', 'ID từ IMDB'],
        ['slug', 'String', 'UNIQUE', 'URL-friendly slug'],
        ['title', 'String', 'NOT NULL', 'Tên phim tiếng Việt'],
        ['originalTitle', 'String?', 'NULL', 'Tên phim gốc'],
        ['description', 'String?', 'NULL', 'Mô tả phim'],
        ['contentType', 'Enum', 'NOT NULL', 'MOVIE/SERIES/ANIME/TRAILER/SHORT'],
        ['status', 'Enum', 'DEFAULT "DRAFT"', 'DRAFT/PUBLISHED/HIDDEN/ARCHIVED'],
        ['quality', 'String?', 'NULL', 'Chất lượng (HD, FHD, 4K)'],
        ['language', 'String?', 'NULL', 'Ngôn ngữ thuyết minh'],
        ['year', 'Int?', 'NULL', 'Năm phát hành'],
        ['duration', 'Int?', 'NULL', 'Thời lượng (phút)'],
        ['episodeCurrent', 'Int?', 'NULL', 'Số tập hiện có'],
        ['episodeTotal', 'Int?', 'NULL', 'Tổng số tập'],
        ['posterUrl', 'String?', 'NULL', 'URL poster'],
        ['backdropUrl', 'String?', 'NULL', 'URL backdrop'],
        ['trailerUrl', 'String?', 'NULL', 'URL trailer'],
        ['rating', 'Float?', 'NULL', 'Điểm đánh giá trung bình'],
        ['viewCount', 'Int', 'DEFAULT 0', 'Lượt xem'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# 2.5.4 Episode
add_heading_custom(doc, '2.5.4 Bảng Episode', level=3)
add_paragraph(doc, "Bảng `Episode` lưu các tập phim, hỗ trợ multi-source streaming và subtitle tracks.", indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.4: Bảng thông tin Episode", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK, cuid', 'Khóa chính'],
        ['movieId', 'String', 'FK → Movie.id', 'Phim cha'],
        ['episodeNumber', 'Int', 'NOT NULL', 'Số tập'],
        ['episodeName', 'String?', 'NULL', 'Tên tập'],
        ['episodeSlug', 'String?', 'NULL', 'Slug tập'],
        ['streamType', 'Enum', 'NULL', 'HLS/MP4/DASH/IFRAME'],
        ['streamUrl', 'String?', 'NULL', 'URL stream chính'],
        ['serverName', 'String?', 'NULL', 'Tên server gốc'],
        ['duration', 'Int?', 'NULL', 'Thời lượng (giây)'],
        ['createdAt', 'DateTime', 'NOT NULL', 'Thời điểm tạo'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# 2.5.5 VideoSource
add_heading_custom(doc, '2.5.5 Bảng VideoSource', level=3)
add_paragraph(doc, "Bảng `VideoSource` lưu nhiều nguồn video cho một tập (failover), với priority để chọn nguồn ưu tiên.", indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.5: Bảng thông tin VideoSource", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK', 'Khóa chính'],
        ['episodeId', 'String', 'FK → Episode.id', 'Tập phim'],
        ['sourceType', 'Enum', 'NOT NULL', 'HLS/MP4/DASH/IFRAME'],
        ['url', 'String', 'NOT NULL', 'URL nguồn'],
        ['label', 'String?', 'NULL', 'Nhãn (Vietsub, Lồng tiếng)'],
        ['mimeType', 'String?', 'NULL', 'MIME type'],
        ['isPrimary', 'Boolean', 'DEFAULT false', 'Có là nguồn chính?'],
        ['isActive', 'Boolean', 'DEFAULT true', 'Còn hoạt động?'],
        ['priority', 'Int', 'DEFAULT 0', 'Độ ưu tiên (cao nhất chọn trước)'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# 2.5.6 SubtitleTrack
add_heading_custom(doc, '2.5.6 Bảng SubtitleTrack', level=3)
add_paragraph(doc, "Bảng `SubtitleTrack` lưu các file phụ đề VTT đa ngôn ngữ cho mỗi tập.", indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.6: Bảng thông tin SubtitleTrack", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK', 'Khóa chính'],
        ['episodeId', 'String', 'FK → Episode.id', 'Tập phim'],
        ['label', 'String', 'NOT NULL', 'Nhãn (Tiếng Việt, English)'],
        ['lang', 'String', 'NOT NULL', 'Mã ngôn ngữ (vi, en, ja)'],
        ['url', 'String', 'NOT NULL', 'URL file VTT'],
        ['isDefault', 'Boolean', 'DEFAULT false', 'Có là mặc định?'],
        ['kind', 'String?', 'NULL', 'subtitles/captions/descriptions'],
        ['isActive', 'Boolean', 'DEFAULT true', 'Còn hoạt động?'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# 2.5.7 Genre
add_heading_custom(doc, '2.5.7 Bảng Genre', level=3)
add_paragraph(doc, "Bảng `Genre` lưu danh sách thể loại phim, có thể đồng bộ với TMDB.", indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.7: Bảng thông tin Genre", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK', 'Khóa chính'],
        ['name', 'String', 'UNIQUE', 'Tên thể loại'],
        ['slug', 'String', 'UNIQUE', 'Slug'],
        ['tmdbId', 'Int?', 'UNIQUE', 'ID tham chiếu TMDB'],
        ['description', 'String?', 'NULL', 'Mô tả'],
        ['sortOrder', 'Int', 'DEFAULT 0', 'Thứ tự hiển thị'],
        ['isActive', 'Boolean', 'DEFAULT true', 'Còn dùng?'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# 2.5.8 Country
add_heading_custom(doc, '2.5.8 Bảng Country', level=3)
add_paragraph(doc, "Bảng `Country` lưu danh sách quốc gia sản xuất phim.", indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.8: Bảng thông tin Country", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK', 'Khóa chính'],
        ['name', 'String', 'UNIQUE', 'Tên quốc gia'],
        ['slug', 'String', 'UNIQUE', 'Slug'],
        ['code', 'String?', 'NULL', 'Mã ISO (VN, US, JP, KR)'],
        ['sortOrder', 'Int', 'DEFAULT 0', 'Thứ tự hiển thị'],
        ['isActive', 'Boolean', 'DEFAULT true', 'Còn dùng?'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# 2.5.9 Person
add_heading_custom(doc, '2.5.9 Bảng Person', level=3)
add_paragraph(doc, "Bảng `Person` lưu thông tin diễn viên, đạo diễn, biên kịch... được sync từ TMDB.", indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.9: Bảng thông tin Person", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK', 'Khóa chính'],
        ['name', 'String', 'NOT NULL', 'Tên'],
        ['slug', 'String', 'UNIQUE', 'Slug'],
        ['originalName', 'String?', 'NULL', 'Tên gốc'],
        ['tmdbId', 'Int?', 'UNIQUE', 'ID TMDB'],
        ['imdbId', 'String?', 'NULL', 'ID IMDB'],
        ['profileUrl', 'String?', 'NULL', 'URL ảnh chân dung'],
        ['biography', 'String?', 'NULL', 'Tiểu sử'],
        ['gender', 'Int?', 'NULL', 'Giới tính (0/1/2)'],
        ['knownFor', 'String?', 'NULL', 'Lĩnh vực nổi tiếng'],
        ['popularity', 'Float?', 'NULL', 'Độ phổ biến (TMDB)'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# 2.5.10 MoviePerson
add_heading_custom(doc, '2.5.10 Bảng MoviePerson', level=3)
add_paragraph(doc, "Bảng `MoviePerson` là bảng trung gian quan hệ N-N giữa Movie và Person, có thêm role (ACTOR, DIRECTOR, ...) và character (vai diễn).", indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.10: Bảng thông tin MoviePerson", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK', 'Khóa chính'],
        ['movieId', 'String', 'FK → Movie.id', 'Phim'],
        ['personId', 'String', 'FK → Person.id', 'Diễn viên/Đạo diễn'],
        ['role', 'Enum', 'NOT NULL', 'ACTOR/DIRECTOR/WRITER/PRODUCER'],
        ['character', 'String?', 'NULL', 'Tên nhân vật'],
        ['department', 'String?', 'NULL', 'Bộ phận (TMDB)'],
        ['job', 'String?', 'NULL', 'Công việc cụ thể'],
        ['sortOrder', 'Int', 'DEFAULT 0', 'Thứ tự hiển thị'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# 2.5.11 WatchHistory
add_heading_custom(doc, '2.5.11 Bảng WatchHistory', level=3)
add_paragraph(doc, "Bảng `WatchHistory` lưu tiến trình xem phim của người dùng, hỗ trợ resume playback.", indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.11: Bảng thông tin WatchHistory", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK', 'Khóa chính'],
        ['userId', 'String', 'FK → User.id', 'Người dùng'],
        ['movieId', 'String', 'FK → Movie.id', 'Phim đã xem'],
        ['episodeId', 'String?', 'FK → Episode.id', 'Tập đã xem (nếu series)'],
        ['progress', 'Float', 'DEFAULT 0', 'Phần trăm hoàn thành'],
        ['currentTime', 'Int', 'DEFAULT 0', 'Vị trí đang xem (giây)'],
        ['duration', 'Int?', 'NULL', 'Tổng thời lượng (giây)'],
        ['isCompleted', 'Boolean', 'DEFAULT false', 'Đã xem xong?'],
        ['deviceType', 'String?', 'NULL', 'Loại thiết bị'],
        ['updatedAt', 'DateTime', 'NOT NULL', 'Lần cập nhật gần nhất'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# 2.5.12 Favorite
add_heading_custom(doc, '2.5.12 Bảng Favorite', level=3)
add_paragraph(doc, "Bảng `Favorite` lưu danh sách phim yêu thích của người dùng.", indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.12: Bảng thông tin Favorite", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK', 'Khóa chính'],
        ['userId', 'String', 'FK → User.id', 'Người dùng'],
        ['movieId', 'String', 'FK → Movie.id', 'Phim yêu thích'],
        ['createdAt', 'DateTime', 'NOT NULL', 'Thời điểm yêu thích'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# 2.5.13 Review
add_heading_custom(doc, '2.5.13 Bảng Review', level=3)
add_paragraph(doc, "Bảng `Review` lưu đánh giá phim của người dùng, có moderation workflow (PENDING → APPROVED/REJECTED/FLAGGED).", indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.13: Bảng thông tin Review", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK', 'Khóa chính'],
        ['userId', 'String', 'FK → User.id', 'Người viết'],
        ['movieId', 'String', 'FK → Movie.id', 'Phim được đánh giá'],
        ['rating', 'Int', 'NOT NULL (1-5)', 'Điểm đánh giá'],
        ['title', 'String?', 'NULL', 'Tiêu đề review'],
        ['content', 'String', 'NOT NULL', 'Nội dung review'],
        ['status', 'Enum', 'DEFAULT "PENDING"', 'PENDING/APPROVED/REJECTED/FLAGGED'],
        ['isSpoiler', 'Boolean', 'DEFAULT false', 'Có spoiler?'],
        ['likeCount', 'Int', 'DEFAULT 0', 'Số lượt thích'],
        ['createdAt', 'DateTime', 'NOT NULL', 'Thời điểm gửi'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# 2.5.14 Wallet
add_heading_custom(doc, '2.5.14 Bảng Wallet', level=3)
add_paragraph(doc, "Bảng `Wallet` lưu thông tin ví TCoin của người dùng (1-1 với User).", indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.14: Bảng thông tin Wallet", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK', 'Khóa chính'],
        ['userId', 'String', 'UNIQUE, FK → User.id', 'Chủ sở hữu'],
        ['balance', 'Int', 'DEFAULT 0', 'Số dư TCoin'],
        ['createdAt', 'DateTime', 'NOT NULL', 'Thời điểm tạo ví'],
        ['updatedAt', 'DateTime', 'NOT NULL', 'Lần cập nhật gần nhất'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# 2.5.15 WalletTransaction
add_heading_custom(doc, '2.5.15 Bảng WalletTransaction', level=3)
add_paragraph(doc, "Bảng `WalletTransaction` lưu lịch sử giao dịch TCoin (credit/debit).", indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.15: Bảng thông tin WalletTransaction", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK', 'Khóa chính'],
        ['walletId', 'String', 'FK → Wallet.id', 'Ví liên quan'],
        ['type', 'Enum', 'NOT NULL', 'CREDIT (nạp) / DEBIT (tiêu)'],
        ['amount', 'Int', 'NOT NULL', 'Số TCoin giao dịch'],
        ['description', 'String?', 'NULL', 'Mô tả giao dịch'],
        ['referenceId', 'String?', 'NULL', 'ID tham chiếu (PaymentOrder, ...)'],
        ['createdAt', 'DateTime', 'NOT NULL', 'Thời điểm giao dịch'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# 2.5.16 PaymentOrder
add_heading_custom(doc, '2.5.16 Bảng PaymentOrder', level=3)
add_paragraph(doc, "Bảng `PaymentOrder` lưu đơn nạp TCoin qua cổng thanh toán SePay.", indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.16: Bảng thông tin PaymentOrder", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK', 'Khóa chính'],
        ['userId', 'String', 'FK → User.id', 'Người nạp'],
        ['amount', 'Int', 'NOT NULL', 'Số tiền VND'],
        ['currency', 'String', 'DEFAULT "VND"', 'Đơn vị tiền'],
        ['tcoins', 'Int', 'NOT NULL', 'Số TCoin nhận được'],
        ['provider', 'String', 'NOT NULL', 'Cổng thanh toán (SePay)'],
        ['providerTxnId', 'String?', 'NULL', 'Mã giao dịch từ cổng'],
        ['status', 'Enum', 'DEFAULT "PENDING"', 'PENDING/COMPLETED/FAILED/REFUNDED'],
        ['paidAt', 'DateTime?', 'NULL', 'Thời điểm thanh toán'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# 2.5.17 WatchPartyRoom
add_heading_custom(doc, '2.5.17 Bảng WatchPartyRoom', level=3)
add_paragraph(doc, "Bảng `WatchPartyRoom` lưu phòng xem chung do Host tạo.", indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.17: Bảng thông tin WatchPartyRoom", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK', 'Khóa chính'],
        ['roomCode', 'String', 'UNIQUE', 'Mã phòng (6 ký tự)'],
        ['title', 'String?', 'NULL', 'Tên phòng'],
        ['hostUserId', 'String', 'FK → User.id', 'Người tạo phòng'],
        ['movieId', 'String', 'FK → Movie.id', 'Phim đang xem'],
        ['episodeId', 'String?', 'FK → Episode.id', 'Tập đang xem'],
        ['status', 'Enum', 'DEFAULT "WAITING"', 'WAITING/ACTIVE/ENDED'],
        ['shareCode', 'String?', 'NULL', 'Mã chia sẻ riêng'],
        ['maxMembers', 'Int', 'DEFAULT 10', 'Giới hạn thành viên'],
        ['createdAt', 'DateTime', 'NOT NULL', 'Thời điểm tạo'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# 2.5.18 WatchPartyParticipant
add_heading_custom(doc, '2.5.18 Bảng WatchPartyParticipant', level=3)
add_paragraph(doc, "Bảng `WatchPartyParticipant` lưu danh sách thành viên đang trong phòng.", indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.18: Bảng thông tin WatchPartyParticipant", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK', 'Khóa chính'],
        ['roomId', 'String', 'FK → WatchPartyRoom.id', 'Phòng'],
        ['userId', 'String?', 'FK → User.id', 'User đăng nhập (NULL nếu guest)'],
        ['displayName', 'String', 'NOT NULL', 'Tên hiển thị'],
        ['role', 'Enum', 'DEFAULT "MEMBER"', 'HOST/CO_HOST/MEMBER/GUEST'],
        ['isOnline', 'Boolean', 'DEFAULT true', 'Có đang online?'],
        ['joinedAt', 'DateTime', 'NOT NULL', 'Thời điểm tham gia'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# 2.5.19 WatchPartyState
add_heading_custom(doc, '2.5.19 Bảng WatchPartyState', level=3)
add_paragraph(doc, "Bảng `WatchPartyState` lưu trạng thái playback chung của phòng (1-1 với Room).", indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.19: Bảng thông tin WatchPartyState", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK', 'Khóa chính'],
        ['roomId', 'String', 'UNIQUE, FK → WatchPartyRoom.id', 'Phòng'],
        ['playbackTime', 'Float', 'DEFAULT 0', 'Thời điểm playback hiện tại'],
        ['isPlaying', 'Boolean', 'DEFAULT false', 'Đang phát hay đang dừng?'],
        ['playbackRate', 'Float', 'DEFAULT 1.0', 'Tốc độ phát'],
        ['version', 'Int', 'DEFAULT 0', 'Version cho optimistic locking'],
        ['updatedAt', 'DateTime', 'NOT NULL', 'Lần cập nhật cuối'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# 2.5.20 WatchPartyMessage
add_heading_custom(doc, '2.5.20 Bảng WatchPartyMessage', level=3)
add_paragraph(doc, "Bảng `WatchPartyMessage` lưu lịch sử chat trong phòng.", indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.20: Bảng thông tin WatchPartyMessage", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK', 'Khóa chính'],
        ['roomId', 'String', 'FK → WatchPartyRoom.id', 'Phòng'],
        ['senderName', 'String', 'NOT NULL', 'Tên người gửi'],
        ['type', 'String', 'DEFAULT "text"', 'text/system/emoji'],
        ['content', 'String', 'NOT NULL', 'Nội dung'],
        ['createdAt', 'DateTime', 'NOT NULL', 'Thời điểm gửi'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# 2.5.21 NewsPost
add_heading_custom(doc, '2.5.21 Bảng NewsPost', level=3)
add_paragraph(doc, "Bảng `NewsPost` lưu các bài tin tức phim trong CMS.", indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.21: Bảng thông tin NewsPost", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK', 'Khóa chính'],
        ['title', 'String', 'NOT NULL', 'Tiêu đề bài viết'],
        ['slug', 'String', 'UNIQUE', 'Slug'],
        ['excerpt', 'String?', 'NULL', 'Mô tả ngắn'],
        ['content', 'String', 'NOT NULL', 'Nội dung HTML/Markdown'],
        ['coverImage', 'String?', 'NULL', 'URL ảnh bìa'],
        ['authorId', 'String', 'FK → User.id', 'Tác giả (admin)'],
        ['status', 'String', 'DEFAULT "DRAFT"', 'DRAFT/PUBLISHED/ARCHIVED'],
        ['tags', 'String?', 'NULL', 'Tags (JSON array)'],
        ['viewCount', 'Int', 'DEFAULT 0', 'Lượt xem'],
        ['publishedAt', 'DateTime?', 'NULL', 'Thời điểm xuất bản'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# 2.5.22 Short
add_heading_custom(doc, '2.5.22 Bảng Short', level=3)
add_paragraph(doc, "Bảng `Short` lưu video ngắn (kiểu TikTok) gắn với phim.", indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.22: Bảng thông tin Short", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK', 'Khóa chính'],
        ['movieId', 'String?', 'FK → Movie.id', 'Phim liên quan'],
        ['title', 'String', 'NOT NULL', 'Tiêu đề'],
        ['slug', 'String', 'UNIQUE', 'Slug'],
        ['videoUrl', 'String', 'NOT NULL', 'URL video'],
        ['sourceType', 'Enum', 'NOT NULL', 'HLS/MP4'],
        ['duration', 'Int?', 'NULL', 'Thời lượng (giây)'],
        ['hashtags', 'String?', 'NULL', 'Hashtags'],
        ['status', 'String', 'DEFAULT "PUBLISHED"', 'Trạng thái'],
        ['createdAt', 'DateTime', 'NOT NULL', 'Thời điểm tạo'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# 2.5.23 AdminLog
add_heading_custom(doc, '2.5.23 Bảng AdminLog', level=3)
add_paragraph(doc, "Bảng `AdminLog` ghi lại mọi hành động của admin để audit.", indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.23: Bảng thông tin AdminLog", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK', 'Khóa chính'],
        ['actorId', 'String', 'FK → User.id', 'Admin thực hiện'],
        ['action', 'String', 'NOT NULL', 'CREATE/UPDATE/DELETE/PUBLISH...'],
        ['targetType', 'String', 'NOT NULL', 'Movie/User/Review...'],
        ['targetId', 'String?', 'NULL', 'ID đối tượng bị tác động'],
        ['metadata', 'String?', 'NULL', 'JSON metadata bổ sung'],
        ['ipAddress', 'String?', 'NULL', 'IP admin'],
        ['createdAt', 'DateTime', 'NOT NULL', 'Thời điểm hành động'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# 2.5.24 Upload
add_heading_custom(doc, '2.5.24 Bảng Upload', level=3)
add_paragraph(doc, "Bảng `Upload` tracking các file media được tải lên.", indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.24: Bảng thông tin Upload", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK', 'Khóa chính'],
        ['fileName', 'String', 'NOT NULL', 'Tên file lưu trên server'],
        ['originalName', 'String', 'NOT NULL', 'Tên gốc'],
        ['mimeType', 'String', 'NOT NULL', 'MIME type'],
        ['size', 'Int', 'NOT NULL', 'Kích thước (bytes)'],
        ['path', 'String', 'NOT NULL', 'Đường dẫn lưu trữ'],
        ['url', 'String', 'NOT NULL', 'URL truy cập công khai'],
        ['uploadedBy', 'String', 'FK → User.id', 'Người upload'],
        ['createdAt', 'DateTime', 'NOT NULL', 'Thời điểm upload'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# 2.5.25 PageView
add_heading_custom(doc, '2.5.25 Bảng PageView', level=3)
add_paragraph(doc, "Bảng `PageView` ghi nhận traffic mọi trang để phục vụ analytics.", indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.25: Bảng thông tin PageView", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK', 'Khóa chính'],
        ['path', 'String', 'NOT NULL', 'Đường dẫn URL'],
        ['movieId', 'String?', 'FK → Movie.id', 'Phim được xem (nếu có)'],
        ['shortId', 'String?', 'FK → Short.id', 'Short được xem'],
        ['userId', 'String?', 'FK → User.id', 'User (nếu đăng nhập)'],
        ['ip', 'String?', 'NULL', 'IP người xem'],
        ['userAgent', 'String?', 'NULL', 'User agent trình duyệt'],
        ['createdAt', 'DateTime', 'NOT NULL', 'Thời điểm xem'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# 2.5.26 SyncJob
add_heading_custom(doc, '2.5.26 Bảng SyncJob', level=3)
add_paragraph(doc, "Bảng `SyncJob` lưu các job đồng bộ dữ liệu (OPhim, TMDB) với trạng thái và kết quả.", indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.26: Bảng thông tin SyncJob", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK', 'Khóa chính'],
        ['source', 'Enum', 'NOT NULL', 'OPHIM/TMDB/MANUAL'],
        ['target', 'String?', 'NULL', 'Đối tượng đồng bộ'],
        ['movieId', 'String?', 'FK → Movie.id', 'Phim đang sync (nếu cụ thể)'],
        ['status', 'Enum', 'DEFAULT "PENDING"', 'PENDING/RUNNING/SUCCESS/FAILED/PARTIAL'],
        ['totalSynced', 'Int', 'DEFAULT 0', 'Số bản ghi đã sync'],
        ['totalFailed', 'Int', 'DEFAULT 0', 'Số bản ghi lỗi'],
        ['startedAt', 'DateTime?', 'NULL', 'Thời điểm bắt đầu'],
        ['completedAt', 'DateTime?', 'NULL', 'Thời điểm hoàn tất'],
        ['createdAt', 'DateTime', 'NOT NULL', 'Thời điểm tạo job'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# 2.5.27 SyncLog
add_heading_custom(doc, '2.5.27 Bảng SyncLog', level=3)
add_paragraph(doc, "Bảng `SyncLog` ghi log chi tiết mọi thao tác trong một SyncJob.", indent_first=1.0)
add_paragraph(doc, "Bảng 2.5.27: Bảng thông tin SyncLog", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Tên trường', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả'],
    rows=[
        ['id', 'String', 'PK', 'Khóa chính'],
        ['syncJobId', 'String', 'FK → SyncJob.id', 'Job cha'],
        ['level', 'Enum', 'NOT NULL', 'INFO/WARN/ERROR'],
        ['entity', 'String', 'NOT NULL', 'Movie/Episode/Person...'],
        ['action', 'String', 'NOT NULL', 'upsert/skip/error'],
        ['message', 'String?', 'NULL', 'Thông điệp log'],
        ['movieId', 'String?', 'FK → Movie.id', 'Phim liên quan'],
        ['createdAt', 'DateTime', 'NOT NULL', 'Thời điểm log'],
    ],
    col_widths=[3.5, 2.8, 3.0, 4.5])

# ========== 2.6 USECASE ==========
add_heading_custom(doc, '2.6 CÁC MÔ HÌNH USECASE', level=2)

usecase_list = [
    ('2.6.1 UseCase tổng quát',
     "Sơ đồ Use Case tổng quát mô tả các actor chính của hệ thống TERENCE và các nhóm chức năng họ có thể thực hiện.",
     "Hình 2.6.1: UseCase tổng quát hệ thống TERENCE",
     ["Người dùng (User): Đăng ký, đăng nhập, duyệt phim, xem phim, đánh giá, watch party, ví TCoin.",
      "Quản trị viên (Admin): CRUD phim/user/news/review, sync dữ liệu, audit log, dashboard.",
      "Hệ thống (System): Pipeline sync tự động, gửi email xác thực, ghi audit log."]),
    ('2.6.2 UseCase Đăng ký / Đăng nhập',
     "Người dùng có thể tạo tài khoản mới bằng email/password và đăng nhập để truy cập các tính năng cá nhân. Session được lưu qua cookie httpOnly 30 ngày.",
     "Hình 2.6.2: UseCase Đăng ký / Đăng nhập",
     ["Đăng ký: Nhập thông tin → Validate Zod → Hash bcrypt → Insert User + Wallet → Gửi email xác thực.",
      "Đăng nhập: Nhập email/password → Verify bcrypt → Tạo Session → Set cookie → Redirect home.",
      "Đăng xuất: Xóa session DB → Clear cookie → Redirect login.",
      "Xác thực email: Click link trong email → Verify token → Cập nhật User.emailVerified."]),
    ('2.6.3 UseCase Duyệt và xem phim',
     "Người dùng có thể duyệt phim theo nhiều cách (trending, mới, thể loại, quốc gia, năm), xem chi tiết phim và phát video với HLS adaptive streaming.",
     "Hình 2.6.3: UseCase Duyệt và xem phim",
     ["Trang chủ: Hiển thị các row (Trending, Mới cập nhật, Phim Bộ, Phim Lẻ).",
      "Tìm kiếm: Search bar với debounce, dropdown suggestions, highlight keyword.",
      "Lọc phim: Filter theo genre/country/year/sort.",
      "Xem chi tiết: Backdrop, poster, mô tả, cast, danh sách tập, nút 'Xem phim'.",
      "Phát phim: HLS.js adaptive streaming, resume playback, episode list, auto next."]),
    ('2.6.4 UseCase Watch Party',
     "Người dùng có thể tạo phòng xem chung và mời bạn bè bằng room code. Mọi thao tác playback được đồng bộ real-time qua Socket.IO. Tích hợp chat và voice/video call qua LiveKit.",
     "Hình 2.6.4: UseCase Watch Party",
     ["Tạo phòng: Chọn phim → POST /api/watch-party/create → Sinh roomCode.",
      "Tham gia phòng: Nhập roomCode → POST /api/watch-party/join → Đồng bộ trạng thái.",
      "Đồng bộ playback: Host play/pause/seek → Socket.IO emit → Guest đồng bộ.",
      "Chat real-time: Gửi tin nhắn → Socket.IO broadcast → Lưu WatchPartyMessage.",
      "Voice/Video call: Bật call → Lấy LiveKit token → Kết nối WebRTC.",
      "Rời phòng: Click leave → Xóa Participant → Broadcast leave event."]),
    ('2.6.5 UseCase Đánh giá phim',
     "Người dùng đăng nhập có thể viết review cho phim đã xem (rating 1-5 + comment). Review trải qua moderation (PENDING → APPROVED) trước khi hiển thị công khai.",
     "Hình 2.6.5: UseCase Đánh giá phim",
     ["Viết review: Chọn rating, viết comment, submit.",
      "Pending: Status = PENDING, chờ admin duyệt.",
      "Duyệt review (Admin): Approve → APPROVED / Reject / Flag.",
      "Hiển thị review: Chỉ APPROVED hiển thị công khai dưới chi tiết phim.",
      "Like review: Người khác like → tăng likeCount."]),
    ('2.6.6 UseCase TCoin',
     "TCoin là tiền ảo trong hệ thống. Người dùng có thể kiếm TCoin từ hoạt động (daily login, review, xem phim) và sử dụng để mở khóa premium features hoặc tip cho creator.",
     "Hình 2.6.6: UseCase TCoin",
     ["Kiếm TCoin: Daily login (+50), Viết review được approve (+30), Xem hết phim (+10).",
      "Xem số dư: GET /api/v1/wallet → Hiển thị balance.",
      "Xem lịch sử: GET /api/v1/wallet/transactions.",
      "Nạp TCoin: Chọn gói → SePay QR Code → Webhook update PaymentOrder → Credit Wallet.",
      "Sử dụng TCoin: Spend trong premium feature → Debit transaction."]),
    ('2.6.7 UseCase Quản trị Admin',
     "Admin có toàn quyền quản lý hệ thống thông qua dashboard với các module: phim, users, reviews, news, sync, audit log, TCoin.",
     "Hình 2.6.7: UseCase Quản trị Admin",
     ["Dashboard: Tổng quan users, phim, reviews, revenue.",
      "CRUD phim: Tạo/sửa/xóa, publish/hide/archive, feature/trending.",
      "Quản lý users: Block/unblock, change role, reset password.",
      "Duyệt review: Approve/Reject/Flag.",
      "CMS tin tức: CRUD news posts.",
      "Trigger sync: Sync OPhim catalog, TMDB enrichment.",
      "Audit log: Xem lịch sử mọi hành động admin.",
      "Quản lý TCoin: Xem wallets, transactions, payment orders."]),
]
for title, intro, fig_caption, items in usecase_list:
    add_heading_custom(doc, title, level=3)
    add_paragraph(doc, intro, indent_first=1.0)
    add_image_placeholder(doc, fig_caption)
    add_paragraph(doc, "Các use case con chính:", indent_first=1.0)
    for it in items:
        p = doc.add_paragraph(style='List Bullet')
        pf = p.paragraph_format
        pf.line_spacing = 1.5
        run = p.add_run(it)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(13)

# ========== 2.7 SEQUENCE DIAGRAMS ==========
add_heading_custom(doc, '2.7 MÔ HÌNH SEQUENCE DIAGRAM', level=2)
add_paragraph(doc,
    "Sequence Diagram mô tả chi tiết luồng giao tiếp giữa các thành phần (actor, frontend, backend, database, external API) theo trình tự thời gian. Dưới đây là các sequence diagram chính của TERENCE.",
    indent_first=1.0)

seq_list = [
    ('2.7.1 Sequence Diagram Đăng ký',
     'Hình 2.7.1: Sequence Diagram Đăng ký',
     "Người dùng nhập thông tin → Frontend validate → POST /api/auth/register → Backend Zod validate → bcrypt hash password → Prisma INSERT User + Wallet → Tạo Session → Set cookie httpOnly → Trả response thành công → Redirect home."),
    ('2.7.2 Sequence Diagram Đăng nhập',
     'Hình 2.7.2: Sequence Diagram Đăng nhập',
     "Người dùng nhập email/password → POST /api/auth/login → Backend tìm User theo email → bcrypt.compare → Nếu đúng: tạo Session, set cookie → Update lastLoginAt + lastLoginIp + loginCount → Trả user info → Frontend redirect."),
    ('2.7.3 Sequence Diagram Xem phim',
     'Hình 2.7.3: Sequence Diagram Xem phim',
     "User mở /watch/[id] → Frontend gọi GET /api/v1/watch/{movieId} → Backend query Movie + Episodes + VideoSources + WatchHistory(userId) → Trả WatchBootstrap → Frontend khởi tạo HLS.js → Resume from currentTime → Mỗi 30s POST /api/v1/progress → Backend UPSERT WatchHistory."),
    ('2.7.4 Sequence Diagram Tạo Watch Party',
     'Hình 2.7.4: Sequence Diagram Tạo Watch Party',
     "Host chọn phim → POST /api/watch-party/create → Backend tạo WatchPartyRoom + WatchPartyState → Sinh roomCode 6 ký tự → Trả room data → Frontend connect Socket.IO room → Host nhận roomCode để chia sẻ."),
    ('2.7.5 Sequence Diagram Đồng bộ Watch Party',
     'Hình 2.7.5: Sequence Diagram Đồng bộ Watch Party',
     "Host play/pause/seek video → Frontend socket.emit('playback:sync', {action, time}) → Socket.IO Server cập nhật WatchPartyState (optimistic version) → Broadcast 'playback:sync' tới tất cả Guest → Guest player đồng bộ với playbackTime mới."),
    ('2.7.6 Sequence Diagram Chat Watch Party',
     'Hình 2.7.6: Sequence Diagram Chat Watch Party',
     "User nhập tin nhắn → socket.emit('message:send', {text}) → Server INSERT WatchPartyMessage → Broadcast 'message:new' tới room → Mọi client nhận và render."),
    ('2.7.7 Sequence Diagram Sync OPhim Pipeline',
     'Hình 2.7.7: Sequence Diagram Sync OPhim Pipeline',
     "Admin nhấn Sync → POST /api/admin/sync/ophim/catalog → Pipeline tạo SyncJob status=RUNNING → Loop: GET OPhim /danh-sach → Với mỗi phim: GET /phim/{slug} → OPhimMapper map sang schema nội bộ → UPSERT Movie/Episodes/Genres/Countries → INSERT SyncLog → Hết: cập nhật SyncJob.status=SUCCESS."),
    ('2.7.8 Sequence Diagram TMDB Enrichment',
     'Hình 2.7.8: Sequence Diagram TMDB Enrichment',
     "Pipeline lấy phim chưa có tmdbId → GET TMDB /search/movie?query={title} → TmdbMatcher chọn best match (theo year + title similarity) → GET /movie/{tmdbId}?append=credits,videos → TmdbMapper map dữ liệu → UPDATE Movie (posterUrl, backdropUrl, tmdbId, rating) → UPSERT Person + MoviePerson → INSERT SyncLog."),
    ('2.7.9 Sequence Diagram Đánh giá phim',
     'Hình 2.7.9: Sequence Diagram Đánh giá phim',
     "User viết review → POST /api/v1/reviews → Backend Zod validate → INSERT Review status=PENDING → Trả response → Admin vào /dashboard/reviews → GET /api/admin/reviews?status=PENDING → Admin click Approve → PATCH /api/admin/reviews/{id} status=APPROVED → INSERT AdminLog → Review hiển thị công khai."),
    ('2.7.10 Sequence Diagram Lưu tiến trình xem',
     'Hình 2.7.10: Sequence Diagram Lưu tiến trình xem',
     "Frontend timer 30s → POST /api/v1/progress {movieId, episodeId, currentTime, duration} → Backend Zod validate → UPSERT WatchHistory (composite key userId + movieId + episodeId) → Tính progress = currentTime / duration → Nếu progress >= 0.9: isCompleted=true → Trả OK."),
    ('2.7.11 Sequence Diagram Thanh toán TCoin',
     'Hình 2.7.11: Sequence Diagram Thanh toán TCoin',
     "User chọn gói TCoin → POST /api/payments/sepay/create → Backend tạo PaymentOrder status=PENDING → Sinh QR Code SePay → Trả QR cho user → User quét QR và thanh toán → SePay gọi webhook POST /api/payments/sepay/webhook → Verify signature → UPDATE PaymentOrder status=COMPLETED → Credit Wallet (+tcoins) → INSERT WalletTransaction CREDIT."),
]
for title, fig_caption, content in seq_list:
    add_heading_custom(doc, title, level=3)
    add_image_placeholder(doc, fig_caption)
    add_paragraph(doc, content, indent_first=1.0)

doc.add_page_break()

# ========== CHƯƠNG 3: CHUẨN HÓA DỮ LIỆU ==========
add_heading_custom(doc, 'CHƯƠNG 3: CHUẨN HÓA DỮ LIỆU', level=1, color=RGBColor(0x1F, 0x49, 0x7D))

add_heading_custom(doc, '3.1 ĐỊNH NGHĨA', level=2)
add_paragraph(doc,
    "Chuẩn hóa dữ liệu (Normalization) là quá trình tổ chức lại các bảng trong cơ sở dữ liệu nhằm giảm thiểu sự dư thừa dữ liệu và đảm bảo tính toàn vẹn dữ liệu. Quá trình chuẩn hóa được thực hiện qua các dạng chuẩn (Normal Form — NF) với mức độ ràng buộc tăng dần: 1NF, 2NF, 3NF, BCNF, 4NF, 5NF.",
    indent_first=1.0)
add_paragraph(doc,
    "Mục tiêu của chuẩn hóa là loại bỏ các bất thường trong cập nhật (update anomaly), bất thường trong chèn (insertion anomaly) và bất thường trong xóa (deletion anomaly). Đồng thời, chuẩn hóa cũng giúp tối ưu hóa bộ nhớ và tăng hiệu năng truy vấn.",
    indent_first=1.0)

add_heading_custom(doc, '3.2 CÁC DẠNG CHUẨN HÓA DỮ LIỆU', level=2)

add_heading_custom(doc, '3.2.1 Dạng chuẩn 1 (1NF)', level=3)
add_paragraph(doc, "Khái niệm thuộc tính đơn:", bold=True, indent_first=1.0)
add_paragraph(doc, "Thuộc tính đơn là thuộc tính mà mỗi giá trị của nó là một giá trị nguyên tử (atomic), không thể phân tách nhỏ hơn. Ví dụ: 'họ tên' là thuộc tính phức (có thể tách thành 'họ', 'tên đệm', 'tên'), trong khi 'tuổi' là thuộc tính đơn.", indent_first=1.0)
add_paragraph(doc, "Định nghĩa dạng chuẩn 1:", bold=True, indent_first=1.0)
add_paragraph(doc, "Một quan hệ R được gọi là ở dạng chuẩn 1 (1NF) nếu mọi thuộc tính của nó đều là thuộc tính đơn và không có nhóm lặp (repeating group).", indent_first=1.0)

add_heading_custom(doc, '3.2.2 Dạng chuẩn 2 (2NF)', level=3)
add_paragraph(doc, "Khái niệm phụ thuộc đầy đủ:", bold=True, indent_first=1.0)
add_paragraph(doc, "Thuộc tính A phụ thuộc hàm đầy đủ vào tập thuộc tính X nếu A phụ thuộc hàm vào X nhưng không phụ thuộc hàm vào bất kỳ tập con thực sự nào của X.", indent_first=1.0)
add_paragraph(doc, "Khái niệm thuộc tính khóa, thuộc tính không khóa:", bold=True, indent_first=1.0)
add_paragraph(doc, "Thuộc tính khóa là thuộc tính thuộc khóa chính hoặc khóa dự tuyển. Các thuộc tính còn lại là thuộc tính không khóa.", indent_first=1.0)
add_paragraph(doc, "Định nghĩa dạng chuẩn 2:", bold=True, indent_first=1.0)
add_paragraph(doc, "Một quan hệ R ở dạng chuẩn 2 nếu R ở 1NF và mọi thuộc tính không khóa đều phụ thuộc hàm đầy đủ vào khóa chính.", indent_first=1.0)

add_heading_custom(doc, '3.2.3 Dạng chuẩn 3 (3NF)', level=3)
add_paragraph(doc, "Khái niệm phụ thuộc bắc cầu:", bold=True, indent_first=1.0)
add_paragraph(doc, "Cho A, B, C là các thuộc tính. Nếu A → B và B → C thì A → C qua phụ thuộc bắc cầu.", indent_first=1.0)
add_paragraph(doc, "Định nghĩa dạng chuẩn 3:", bold=True, indent_first=1.0)
add_paragraph(doc, "Một quan hệ R ở dạng chuẩn 3 nếu R ở 2NF và không có thuộc tính không khóa nào phụ thuộc bắc cầu vào khóa chính.", indent_first=1.0)

add_heading_custom(doc, '3.2.4 Dạng chuẩn BCNF (Boyce-Codd Normal Form)', level=3)
add_paragraph(doc, "Định nghĩa:", bold=True, indent_first=1.0)
add_paragraph(doc, "Một quan hệ R ở dạng chuẩn BCNF nếu R ở 3NF và mọi phụ thuộc hàm không tầm thường X → A đều có X là siêu khóa (superkey).", indent_first=1.0)
add_paragraph(doc, "BCNF là dạng chuẩn nghiêm ngặt hơn 3NF, loại bỏ các phụ thuộc hàm bất thường còn lại trong 3NF.", indent_first=1.0)

add_heading_custom(doc, '3.2.5 Dạng chuẩn 4 (4NF)', level=3)
add_paragraph(doc, "Phụ thuộc đa trị:", bold=True, indent_first=1.0)
add_paragraph(doc, "Cho R(X, Y, Z), nói Y phụ thuộc đa trị vào X (X →→ Y) nếu với mỗi giá trị của X, tập giá trị của Y độc lập với giá trị của Z.", indent_first=1.0)
add_paragraph(doc, "Định nghĩa dạng chuẩn 4:", bold=True, indent_first=1.0)
add_paragraph(doc, "Một quan hệ R ở dạng chuẩn 4 nếu R ở BCNF và mọi phụ thuộc đa trị không tầm thường X →→ Y đều có X là siêu khóa.", indent_first=1.0)

add_heading_custom(doc, '3.3 PHƯƠNG THỨC CHUẨN HÓA DỮ LIỆU', level=2)
add_paragraph(doc,
    "Quá trình chuẩn hóa được tiến hành tuần tự từ 1NF lên các dạng chuẩn cao hơn. Mỗi bước, ta phân rã quan hệ ban đầu thành các quan hệ con bằng cách:",
    indent_first=1.0)
phuong_thuc = [
    "Tách các thuộc tính đa trị thành bảng con riêng (1NF).",
    "Tách các phụ thuộc một phần thành bảng con với khóa chính phù hợp (2NF).",
    "Tách các phụ thuộc bắc cầu thành bảng riêng (3NF).",
    "Tách các phụ thuộc không có siêu khóa thành bảng riêng (BCNF).",
    "Tách các phụ thuộc đa trị độc lập thành bảng riêng (4NF).",
]
for x in phuong_thuc:
    p = doc.add_paragraph(style='List Bullet')
    pf = p.paragraph_format
    pf.line_spacing = 1.5
    run = p.add_run(x)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(13)

add_heading_custom(doc, '3.4 CÁC PHỤ THUỘC HÀM TRONG HỆ THỐNG TERENCE', level=2)
add_paragraph(doc, "Phân tích các phụ thuộc hàm chính trong hệ thống TERENCE:", indent_first=1.0)

add_paragraph(doc, "Bảng 3.1: Các phụ thuộc hàm trong hệ thống TERENCE", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=12)
add_table_data(doc,
    headers=['Bảng', 'Phụ thuộc hàm', 'Dạng chuẩn'],
    rows=[
        ['User', 'id → name, email, passwordHash, role, status', 'BCNF'],
        ['User', 'email → id (unique)', 'BCNF'],
        ['Session', 'id → userId, expiresAt', 'BCNF'],
        ['Movie', 'id → slug, title, contentType, status, year, rating', 'BCNF'],
        ['Movie', 'slug → id (unique)', 'BCNF'],
        ['Movie', 'tmdbId → id', 'BCNF'],
        ['Episode', 'id → movieId, episodeNumber, streamUrl', 'BCNF'],
        ['Episode', '(movieId, episodeNumber) → id', 'BCNF'],
        ['VideoSource', 'id → episodeId, url, sourceType, priority', 'BCNF'],
        ['Genre', 'id → name, slug; slug → id', 'BCNF'],
        ['MovieGenre', '(movieId, genreId) → id', 'BCNF'],
        ['Country', 'id → name, slug, code', 'BCNF'],
        ['Person', 'id → name, slug, tmdbId', 'BCNF'],
        ['MoviePerson', 'id → movieId, personId, role, character', 'BCNF'],
        ['WatchHistory', 'id → userId, movieId, episodeId, currentTime, progress', 'BCNF'],
        ['WatchHistory', '(userId, movieId, episodeId) → id', 'BCNF'],
        ['Favorite', '(userId, movieId) → id', 'BCNF'],
        ['Review', 'id → userId, movieId, rating, content, status', 'BCNF'],
        ['Wallet', 'userId → id (1-1)', 'BCNF'],
        ['WalletTransaction', 'id → walletId, type, amount, referenceId', 'BCNF'],
        ['PaymentOrder', 'id → userId, amount, tcoins, status; providerTxnId → id', 'BCNF'],
        ['WatchPartyRoom', 'id → roomCode, hostUserId, movieId, status; roomCode → id', 'BCNF'],
        ['WatchPartyState', 'roomId → id (1-1)', 'BCNF'],
        ['AdminLog', 'id → actorId, action, targetType, targetId, createdAt', 'BCNF'],
        ['SyncJob', 'id → source, status, totalSynced, startedAt, completedAt', 'BCNF'],
        ['SyncLog', 'id → syncJobId, level, entity, action, message', 'BCNF'],
    ],
    col_widths=[3.5, 8.0, 2.0])

add_heading_custom(doc, '3.5 CÁC THỰC THỂ SAU CHUẨN HÓA', level=2)
add_paragraph(doc,
    "Sau khi áp dụng các nguyên tắc chuẩn hóa, hệ thống TERENCE đạt được 30+ bảng dữ liệu, tất cả đều thỏa mãn dạng chuẩn BCNF. Cụ thể:",
    indent_first=1.0)

ts_groups = [
    ("Nhóm User & Auth", "User, Session"),
    ("Nhóm Catalog", "Movie, Episode, VideoSource, SubtitleTrack, MovieSource"),
    ("Nhóm Taxonomy", "Genre, MovieGenre, Category, MovieCategory, Country, MovieCountry, Person, MoviePerson"),
    ("Nhóm User Interactions", "WatchHistory, Favorite, Review"),
    ("Nhóm TCoin & Payments", "Wallet, WalletTransaction, PaymentOrder"),
    ("Nhóm Watch Party", "WatchPartyRoom, WatchPartyParticipant, WatchPartyState, WatchPartyMessage"),
    ("Nhóm CMS & Content", "NewsPost, Short, Upload"),
    ("Nhóm Admin & Analytics", "AdminLog, PageView"),
    ("Nhóm Sync Pipeline", "SyncJob, SyncLog"),
]
for ten, ds in ts_groups:
    p = doc.add_paragraph(style='List Bullet')
    pf = p.paragraph_format
    pf.line_spacing = 1.5
    r1 = p.add_run(ten + ': ')
    r1.bold = True
    r1.font.name = 'Times New Roman'
    r1.font.size = Pt(13)
    r2 = p.add_run(ds)
    r2.font.name = 'Times New Roman'
    r2.font.size = Pt(13)

add_paragraph(doc,
    "Tất cả các bảng đều đạt 3NF và phần lớn đạt BCNF nhờ thiết kế khóa chính cuid duy nhất, sử dụng bảng trung gian cho mọi quan hệ N-N (tránh phụ thuộc đa trị), và tách các phụ thuộc bắc cầu thành các bảng độc lập.",
    indent_first=1.0)

add_heading_custom(doc, '3.6 ĐỒ THỊ QUAN HỆ', level=2)
add_paragraph(doc,
    "Đồ thị quan hệ sau chuẩn hóa thể hiện mối liên kết giữa các bảng. User là trung tâm về tương tác người dùng (kết nối tới Session, WatchHistory, Favorite, Review, Wallet, WatchPartyRoom, AdminLog). Movie là trung tâm về dữ liệu nội dung (kết nối tới Episode, MovieGenre, MovieCountry, MoviePerson, MovieSource, WatchHistory, Favorite, Review, Short, WatchPartyRoom).",
    indent_first=1.0)
add_image_placeholder(doc, 'Hình 3.1: Đồ thị quan hệ sau chuẩn hóa của hệ thống TERENCE')

doc.add_page_break()

# ========== CHƯƠNG 4: GIAO DIỆN ==========
add_heading_custom(doc, 'CHƯƠNG 4: GIAO DIỆN WEBSITE', level=1, color=RGBColor(0x1F, 0x49, 0x7D))

ui_screens = [
    ('4.1 Giao diện trang chủ', 'Hình 4.1: Giao diện trang chủ',
     "Trang chủ TERENCE được thiết kế tối giản, lấy cảm hứng từ các nền tảng quốc tế. Hero banner full-width chiếm phần đầu trang với phim được feature, kèm overlay gradient, tiêu đề + tagline + nút CTA \"Xem ngay\". Bên dưới là các movie rows: Trending hôm nay, Mới cập nhật, Phim Bộ HOT, Phim Lẻ HOT, Xem tiếp (nếu đã đăng nhập). Mỗi row có horizontal scroll với arrow buttons trái/phải trên desktop và swipe trên mobile. Header sticky chứa logo, navigation menu, search bar và avatar user."),
    ('4.2 Giao diện trang đăng nhập', 'Hình 4.2: Giao diện trang đăng nhập',
     "Trang đăng nhập có split layout cinematic: bên trái là form đăng nhập (input email, password, nút \"Quên mật khẩu\", nút submit, link \"Chưa có tài khoản? Đăng ký ngay\"), bên phải là background poster phim đang trending kèm overlay gradient và logo TERENCE. Form được validate client-side bằng React Hook Form + Zod resolver."),
    ('4.3 Giao diện trang đăng ký', 'Hình 4.3: Giao diện trang đăng ký',
     "Tương tự trang đăng nhập với form gồm các trường: Họ tên, Email, Mật khẩu, Xác nhận mật khẩu, Checkbox đồng ý điều khoản. Sau khi submit thành công, hệ thống tự động đăng nhập và redirect về trang chủ."),
    ('4.4 Giao diện trang duyệt phim (Browse)', 'Hình 4.4: Giao diện trang duyệt phim',
     "Trang Browse có sidebar filter bên trái (thể loại multi-select, quốc gia dropdown, năm range, sort options) và grid movie card bên phải. Mỗi card hiển thị poster, tiêu đề, năm, rating badge, badge phim bộ/anime. Hover hiển thị overlay với mô tả ngắn và nút \"Xem ngay\". Pagination ở cuối trang."),
    ('4.5 Giao diện trang chi tiết phim', 'Hình 4.5: Giao diện trang chi tiết phim',
     "Trang chi tiết phim có backdrop full-width làm background, poster phim bên trái, thông tin chi tiết bên phải (tiêu đề, năm, thể loại, quốc gia, đạo diễn, mô tả, nút \"Xem phim\" + nút yêu thích). Tab navigation gồm: Tổng quan, Diễn viên (grid), Tập phim (list), Phim tương tự, Đánh giá."),
    ('4.6 Giao diện trang xem phim (Player)', 'Hình 4.6: Giao diện trang xem phim',
     "Player HLS.js full-width với custom controls: play/pause, seek bar với preview thumbnail, volume, fullscreen, quality selector (Auto/720p/1080p), subtitle toggle, settings menu. Sidebar bên phải hiển thị danh sách tập phim (cho series), highlight tập đang xem. Bên dưới player là thông tin phim và phần đánh giá."),
    ('4.7 Giao diện trang Watch Party', 'Hình 4.7: Giao diện trang Watch Party',
     "Layout Watch Party chia 3 cột: bên trái là player video đồng bộ, giữa là chat real-time (header tên phòng + danh sách participant, message list, input box), bên phải là LiveKit video grid hiển thị webcam của các participant. Header phòng hiển thị roomCode, nút share, nút \"Rời phòng\"."),
    ('4.8 Giao diện Watch Party — Chat & Video Call', 'Hình 4.8: Giao diện Watch Party — Chat & Video Call',
     "Khi bật voice/video call, các video tile của participant được hiển thị grid responsive (1-2-3-4 cột tùy số người). Mỗi tile có tên, mic indicator, camera off icon, và speaker indicator. Chat panel hỗ trợ emoji, gif, system message (join/leave/playback)."),
    ('4.9 Giao diện trang Tin tức phim', 'Hình 4.9: Giao diện trang Tin tức phim',
     "Trang tin tức có grid layout 3 cột với mỗi card gồm: thumbnail, category badge, tiêu đề, excerpt, ngày đăng, tác giả. Click vào card mở trang chi tiết bài viết. Filter theo category ở header."),
    ('4.10 Giao diện trang Đánh giá phim', 'Hình 4.10: Giao diện trang Đánh giá phim',
     "Section đánh giá nằm dưới chi tiết phim. Form viết review: rating stars 1-5, ô textarea content, button submit. Danh sách review hiển thị theo thời gian mới nhất: avatar, tên, rating, nội dung, like button, ngày."),
    ('4.11 Giao diện trang Ví TCoin', 'Hình 4.11: Giao diện trang Ví TCoin',
     "Trang ví hiển thị số dư TCoin lớn ở đầu, các card thống kê (tổng nạp, tổng tiêu, transactions tháng này). Tab \"Lịch sử giao dịch\" hiển thị table với type (Credit/Debit), amount, description, ngày. Tab \"Nạp TCoin\" hiển thị các gói (50 TCoin, 200 TCoin, 500 TCoin) với giá VND."),
    ('4.12 Giao diện trang Lịch sử xem', 'Hình 4.12: Giao diện trang Lịch sử xem',
     "Hiển thị grid phim đã xem, mỗi card có poster, tiêu đề, progress bar dưới poster (tỉ lệ %), nút \"Xem tiếp\". Sắp xếp theo thời gian xem gần nhất. Filter theo trạng thái (Đang xem dở / Đã xem xong)."),
    ('4.13 Giao diện trang Profile', 'Hình 4.13: Giao diện trang Profile',
     "Trang profile có header banner + avatar overlap, thông tin (tên, email, bio, ngày tham gia). Tabs: Thông tin (form cập nhật), Bảo mật (đổi mật khẩu), Đánh giá đã viết, Phim yêu thích, Lịch sử."),
    ('4.14 Giao diện trang Short Video', 'Hình 4.14: Giao diện trang Short Video',
     "Trang Short Video có vertical swipe feed kiểu TikTok: video player full-screen, sidebar phải gồm avatar, like button, comment button, share button. Swipe lên để chuyển video tiếp theo. Auto-play với mute mặc định."),
    ('4.15 Giao diện Admin Dashboard', 'Hình 4.15: Giao diện Admin Dashboard',
     "Dashboard có sidebar trái với menu: Tổng quan, Phim, Tập phim, Users, Reviews, News, Genres, Countries, Persons, Sync, TCoin, Audit Log, Settings. Topbar gồm tên admin, role, logout button. Main area hiển thị các card stats (Tổng users, Tổng phim, Reviews tháng, Revenue), biểu đồ Recharts (page views 7 ngày, top movies), và recent activity list."),
    ('4.16 Giao diện Admin — Quản lý phim', 'Hình 4.16: Giao diện Admin — Quản lý phim',
     "Table phim với cột: Poster, Tiêu đề, Type, Status (DRAFT/PUBLISHED/HIDDEN), Year, Rating, Created. Search bar trên đầu, filter theo type/status, sort columns. Actions per row: Sửa, Xóa, Publish/Hide, Feature toggle, Trending toggle. Nút \"Thêm phim\" mở Dialog form đầy đủ các trường."),
    ('4.17 Giao diện Admin — Quản lý người dùng', 'Hình 4.17: Giao diện Admin — Quản lý người dùng',
     "Table users với cột: Avatar, Tên, Email, Role, Status, Login count, Last login. Filter theo role/status. Actions: Block/Unblock, Change role dropdown, Reset password, View detail. Modal xác nhận trước khi thực hiện hành động nhạy cảm."),
    ('4.18 Giao diện Admin — Duyệt đánh giá', 'Hình 4.18: Giao diện Admin — Duyệt đánh giá',
     "Hiển thị danh sách pending reviews dạng card: avatar user, phim, rating stars, nội dung review, ngày gửi. Nút Approve (xanh) / Reject (đỏ) / Flag (vàng) cho mỗi card. Filter tab: Pending, Approved, Rejected, Flagged."),
    ('4.19 Giao diện Admin — Sync dữ liệu', 'Hình 4.19: Giao diện Admin — Sync dữ liệu',
     "Hai card chính: \"Sync OPhim Catalog\" và \"TMDB Enrichment\". Mỗi card có nút trigger sync, progress bar khi đang chạy, thống kê lần sync gần nhất (tổng synced, errors, duration). Bên dưới là table SyncJob với status và link xem SyncLog chi tiết."),
    ('4.20 Giao diện Admin — Audit Log', 'Hình 4.20: Giao diện Admin — Audit Log',
     "Table audit log với cột: Time, Admin, Action, Target Type, Target ID, IP. Filter theo admin, action type, date range. Click row mở modal hiển thị metadata JSON đầy đủ. Export CSV button."),
]
for ten, fig_caption, content in ui_screens:
    add_heading_custom(doc, ten, level=2)
    add_image_placeholder(doc, fig_caption)
    add_paragraph(doc, content, indent_first=1.0)

doc.add_page_break()

# ========== CHƯƠNG 5: KẾT LUẬN ==========
add_heading_custom(doc, 'CHƯƠNG 5: KẾT LUẬN', level=1, color=RGBColor(0x1F, 0x49, 0x7D))

add_heading_custom(doc, '5.1 ƯU ĐIỂM', level=2)
add_paragraph(doc, "Sau 4 tuần phát triển, dự án TERENCE đã đạt được những kết quả nổi bật:", indent_first=1.0)

uu_diem = [
    ("Kiến trúc hiện đại và rõ ràng", "Áp dụng thành công mô hình Modular Monolith với Layered Architecture 4 tầng (Presentation/Application/Domain/Data). Mỗi module có trách nhiệm rõ ràng và ranh giới chặt chẽ, dễ maintain và mở rộng."),
    ("Công nghệ tiên tiến", "Sử dụng Next.js 16 App Router với React Server Components, giảm bundle size client-side. TypeScript xuyên suốt full-stack đảm bảo type safety. Tailwind CSS 4 + shadcn/ui cho UI nhất quán và accessible."),
    ("Tính năng đầy đủ và độc đáo", "Hệ thống có đầy đủ các tính năng cốt lõi của một nền tảng xem phim: duyệt/tìm/lọc phim, HLS adaptive streaming, watch history với resume, đánh giá moderation, tin tức CMS. Đặc biệt nổi bật là tính năng Watch Party real-time với Socket.IO + LiveKit WebRTC — chưa nhiều nền tảng nội địa có."),
    ("Pipeline đồng bộ dữ liệu tự động", "Tích hợp thành công pipeline OPhim → TMDB enrichment, giúp kho phim được cập nhật tự động với metadata phong phú (poster HD, cast, trailer). Có SyncJob/SyncLog tracking đầy đủ và error recovery."),
    ("Hệ thống quản trị chuyên nghiệp", "Admin Dashboard với 12+ module, phân quyền RBAC 5 cấp, audit log đầy đủ cho mọi hành động. UI admin được thiết kế responsive và user-friendly."),
    ("Triển khai production thực tế", "Hệ thống đã được deploy trên Vultr VPS với PM2 process manager, Nginx reverse proxy, SSL Let's Encrypt và Cloudflare DNS proxy. Hoạt động ổn định 24/7."),
    ("Tài liệu kỹ thuật đầy đủ", "Hơn 20 file tài liệu trong `docs/` bao gồm: README chính (~3000 dòng), architecture, ERD, sequence diagrams, coding convention, API docs, deployment guide. Có Postman Collection và test plan đầy đủ."),
    ("Quy trình phát triển chuyên nghiệp", "Áp dụng Git workflow chuẩn với branch strategy, PR template, code review. Sử dụng Vitest cho unit test, Postman cho integration test. Có CI/CD pipeline cơ bản."),
]
for ten, mota in uu_diem:
    p = doc.add_paragraph(style='List Bullet')
    pf = p.paragraph_format
    pf.line_spacing = 1.5
    r1 = p.add_run(ten + ': ')
    r1.bold = True
    r1.font.name = 'Times New Roman'
    r1.font.size = Pt(13)
    r2 = p.add_run(mota)
    r2.font.name = 'Times New Roman'
    r2.font.size = Pt(13)

add_heading_custom(doc, '5.2 NHƯỢC ĐIỂM', level=2)
add_paragraph(doc, "Bên cạnh những kết quả đạt được, dự án vẫn còn một số hạn chế:", indent_first=1.0)
nhuoc_diem = [
    ("Cơ sở dữ liệu SQLite", "SQLite phù hợp cho phase đồ án nhưng không thể scale horizontal khi traffic tăng. Thiếu hỗ trợ full-text search nâng cao và concurrency cao."),
    ("Chưa có hệ thống caching đầy đủ", "Chỉ có Redis caching cho một số endpoint. Còn nhiều query Prisma có thể được cache để giảm tải DB."),
    ("Chưa có CDN cho media", "Toàn bộ poster/backdrop/upload đang serve trực tiếp từ VPS, có thể gây bottleneck khi user tăng. Chưa tận dụng Cloudflare CDN cho static assets."),
    ("Chưa có background job queue", "Pipeline sync hiện chạy trong process Next.js chính, có thể block I/O khi sync nhiều phim. Cần tách ra worker process với queue như BullMQ."),
    ("Hệ thống recommendation đơn giản", "Hiện chỉ recommendation dựa trên thể loại và lượt xem. Chưa có collaborative filtering hay machine learning model."),
    ("Mobile app chưa phát triển", "Hiện chỉ có web responsive. Chưa có native mobile app cho iOS/Android."),
    ("Test coverage chưa cao", "Một số module quan trọng (Watch Party, Payment) chưa có đầy đủ unit test và E2E test."),
    ("Chưa có monitoring và alerting", "Thiếu Sentry/Grafana cho error monitoring và Prometheus cho metrics. Khi có lỗi production, phải xem log thủ công."),
]
for ten, mota in nhuoc_diem:
    p = doc.add_paragraph(style='List Bullet')
    pf = p.paragraph_format
    pf.line_spacing = 1.5
    r1 = p.add_run(ten + ': ')
    r1.bold = True
    r1.font.name = 'Times New Roman'
    r1.font.size = Pt(13)
    r2 = p.add_run(mota)
    r2.font.name = 'Times New Roman'
    r2.font.size = Pt(13)

add_heading_custom(doc, '5.3 HƯỚNG PHÁT TRIỂN', level=2)
add_paragraph(doc, "Dựa trên các nhược điểm trên, nhóm đề xuất các hướng phát triển tiếp theo:", indent_first=1.0)

huong_pt = [
    ("Migrate sang PostgreSQL", "Chuyển từ SQLite sang PostgreSQL để tận dụng các tính năng nâng cao: full-text search (tsvector), JSONB indexing, partition table, replication, và scale horizontal. Việc migrate được hỗ trợ bởi Prisma — chỉ cần đổi datasource provider."),
    ("Tích hợp Redis caching toàn diện", "Cache các query phổ biến (trending movies, popular reviews, user wallet) với TTL phù hợp. Sử dụng Redis Streams cho real-time events. Cache invalidation thông minh khi data thay đổi."),
    ("CDN cho static assets", "Đẩy poster, backdrop, upload, video thumbnail lên Cloudflare R2 / AWS S3 + CloudFront để giảm tải VPS và tăng tốc độ load toàn cầu."),
    ("Background job queue với BullMQ", "Tách pipeline sync thành worker process riêng, sử dụng BullMQ + Redis cho queue management. Có retry, priority, scheduled jobs."),
    ("AI Recommendation Engine", "Tích hợp collaborative filtering hoặc content-based filtering bằng Python (FastAPI service) + Scikit-learn / TensorFlow. Personalized recommendation dựa trên watch history và rating."),
    ("Mobile app với React Native", "Phát triển native mobile app cho iOS và Android dùng React Native + Expo, chia sẻ business logic với web qua monorepo."),
    ("Monitoring với Sentry + Grafana", "Tích hợp Sentry cho error tracking, Prometheus + Grafana cho metrics (request rate, latency, DB connections, sync job status). PagerDuty alert khi có sự cố."),
    ("Testing toàn diện", "Tăng coverage lên 80%+ với Vitest unit test, Playwright E2E test cho các flow quan trọng (auth, payment, watch party). Thiết lập CI để run test tự động trước merge."),
    ("Payment gateway production", "Tích hợp các cổng thanh toán thực tế: VNPay, Momo, ZaloPay. Hỗ trợ subscription model (gói tháng/năm) bên cạnh TCoin."),
    ("DRM cho video", "Bổ sung Widevine/FairPlay DRM cho các phim premium để bảo vệ bản quyền nếu mở rộng sang nội dung độc quyền."),
    ("Multi-language i18n", "Hỗ trợ đa ngôn ngữ (Việt, Anh, Trung) với next-intl, bao gồm cả admin dashboard và content."),
    ("Live streaming events", "Tận dụng LiveKit để phát các sự kiện trực tiếp (giao lưu diễn viên, premiere phim, watch party có host streamer)."),
]
for ten, mota in huong_pt:
    p = doc.add_paragraph(style='List Bullet')
    pf = p.paragraph_format
    pf.line_spacing = 1.5
    r1 = p.add_run(ten + ': ')
    r1.bold = True
    r1.font.name = 'Times New Roman'
    r1.font.size = Pt(13)
    r2 = p.add_run(mota)
    r2.font.name = 'Times New Roman'
    r2.font.size = Pt(13)

add_paragraph(doc,
    "Tổng kết lại, đề tài TERENCE đã đạt được mục tiêu đặt ra ban đầu là xây dựng một website xem phim trực tuyến full-stack hoàn chỉnh với kiến trúc hiện đại, tính năng đa dạng và khả năng deploy production. Mặc dù còn một số hạn chế, nhưng đây là nền tảng vững chắc để mở rộng thành sản phẩm thương mại trong tương lai. Quan trọng hơn, qua quá trình thực hiện, nhóm đã học được rất nhiều kiến thức và kỹ năng quý báu cả về mặt kỹ thuật (Next.js, Prisma, Socket.IO, LiveKit, HLS, RBAC, deploy production) lẫn quy trình phát triển phần mềm (agile, code review, testing, documentation, teamwork).",
    indent_first=1.0)

doc.add_page_break()

# ========== TÀI LIỆU THAM KHẢO ==========
add_heading_custom(doc, 'TÀI LIỆU THAM KHẢO', level=0)

tai_lieu = [
    "[1] Vercel Team (2025). Next.js 16 Documentation. https://nextjs.org/docs",
    "[2] Microsoft (2025). TypeScript 5.7 Handbook. https://www.typescriptlang.org/docs",
    "[3] Tailwind Labs (2025). Tailwind CSS 4 Documentation. https://tailwindcss.com/docs",
    "[4] Prisma (2025). Prisma 6 Documentation. https://www.prisma.io/docs",
    "[5] D. Richard Hipp (2024). SQLite Documentation. https://www.sqlite.org/docs.html",
    "[6] Socket.IO Team (2025). Socket.IO 4.8 Documentation. https://socket.io/docs/v4",
    "[7] LiveKit (2025). LiveKit Documentation. https://docs.livekit.io",
    "[8] HLS.js (2025). HLS.js API Reference. https://github.com/video-dev/hls.js",
    "[9] shadcn (2025). shadcn/ui Components. https://ui.shadcn.com",
    "[10] WAI-ARIA Authoring Practices (W3C, 2024). https://www.w3.org/WAI/ARIA/apg/",
    "[11] TMDB API Documentation. https://developers.themoviedb.org/3",
    "[12] OPhim API. https://ophim1.com",
    "[13] Sam Newman (2020). Building Microservices, 2nd Edition. O'Reilly Media.",
    "[14] Robert C. Martin (2017). Clean Architecture: A Craftsman's Guide to Software Structure and Design. Prentice Hall.",
    "[15] E. F. Codd (1972). Further Normalization of the Data Base Relational Model. IBM Research.",
    "[16] Martin Kleppmann (2017). Designing Data-Intensive Applications. O'Reilly Media.",
    "[17] Trần Đan Thư, Phạm Trần Vũ (2018). Giáo trình Cơ sở dữ liệu. NXB Đại học Quốc gia TP.HCM.",
    "[18] Nguyễn Văn Vy (2020). Giáo trình Phân tích và Thiết kế Hệ thống Thông tin. NXB Khoa học và Kỹ thuật.",
    "[19] Vultr Documentation. https://docs.vultr.com",
    "[20] Cloudflare Developer Documentation. https://developers.cloudflare.com",
]
for tl in tai_lieu:
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.line_spacing = 1.5
    pf.left_indent = Cm(0.5)
    pf.first_line_indent = Cm(-0.5)
    run = p.add_run(tl)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(13)

# Save
output_path = r'd:\Hutech\Đồ Án\TERENCE\TERENCE-main\docs\BCDA\TERENCE_BaoCao_DoAn_Final.docx'
doc.save(output_path)
import sys
sys.stdout.reconfigure(encoding='utf-8')
print(f'\n[OK] Da tao file bao cao: {output_path}')
print(f'[INFO] Mo file bang Word -> Tab References -> Update Table of Contents (F9) de cap nhat muc luc.')
print(f'[INFO] Cac vi tri [CHEN HINH: ...] ban tu thay bang anh that.')
