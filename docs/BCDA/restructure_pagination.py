"""
Restructure Word document pagination per HUTECH thesis standard:
- Cover page: no page number
- Front matter (Loi cam on, Nhan xet, Muc luc, Danh muc...): roman lowercase (i, ii, iii...)
- Main content (from LOI MO DAU): arabic decimal (1, 2, 3...) restart from 1
- Page numbers: centered footer, Times New Roman, size 13
- Only one Section Break (Next Page) right before LOI MO DAU
- Different-first-page used so cover stays unnumbered in section 1
- Add TOC field after MUC LUC for auto-update
"""

import sys
import io
import copy
import os
from docx import Document
from docx.oxml.ns import qn, nsmap
from lxml import etree

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


def W(tag):
    return f"{{{W_NS}}}{tag}"


SRC = os.path.join(os.path.dirname(__file__), "Nhom2_WebsiteXemPhimTrucTuyen_DACS_20260519.docx")
DST = os.path.join(os.path.dirname(__file__), "Nhom2_WebsiteXemPhimTrucTuyen_DACS_20260519_FIXED_v2.docx")

doc = Document(SRC)
body = doc.element.body

# ---------------------------------------------------------------------------
# 1. Locate boundary paragraphs by content (robust against index drift)
# ---------------------------------------------------------------------------
paragraphs = doc.paragraphs

idx_loi_mo_dau = None
idx_muc_luc = None
idx_loi_cam_on = None
for i, p in enumerate(paragraphs):
    t = p.text.strip().upper()
    if t == "LỜI MỞ ĐẦU" and idx_loi_mo_dau is None:
        idx_loi_mo_dau = i
    if t == "MỤC LỤC" and idx_muc_luc is None:
        idx_muc_luc = i
    if t == "LỜI CẢM ƠN" and idx_loi_cam_on is None:
        idx_loi_cam_on = i

print(f"LOI CAM ON at paragraph index: {idx_loi_cam_on}")
print(f"MUC LUC    at paragraph index: {idx_muc_luc}")
print(f"LOI MO DAU at paragraph index: {idx_loi_mo_dau}")

p_loi_mo_dau = paragraphs[idx_loi_mo_dau]
p_muc_luc = paragraphs[idx_muc_luc]
p_loi_cam_on = paragraphs[idx_loi_cam_on]

# Paragraphs that will carry section breaks:
#   p_before_lco  -> end-of-cover sectPr (Section 0: cover)
#   p_before_lmd  -> end-of-front-matter sectPr (Section 1: front matter)
# The original body sectPr remains as Section 2 (main content).
p_before_lco = paragraphs[idx_loi_cam_on - 1]
p_before_lmd = paragraphs[idx_loi_mo_dau - 1]
print(f"Para before LOI CAM ON (idx {idx_loi_cam_on - 1}) text: '{p_before_lco.text[:60]}'")
print(f"Para before LOI MO DAU (idx {idx_loi_mo_dau - 1}) text: '{p_before_lmd.text[:60]}'")

# ---------------------------------------------------------------------------
# 2. Remove existing page breaks in the paragraphs that will become section
#    boundaries (we'll replace them with Section Break (Next Page))
# ---------------------------------------------------------------------------
def remove_page_breaks(p, label):
    n = 0
    for br in list(p._p.iter(W("br"))):
        if br.get(W("type")) == "page":
            br.getparent().remove(br)
            n += 1
    print(f"Removed {n} page-break(s) from {label}")


remove_page_breaks(p_before_lco, "para before LOI CAM ON")
remove_page_breaks(p_before_lmd, "para before LOI MO DAU")

# ---------------------------------------------------------------------------
# 3. Build three sectPr elements:
#    sect0 = Cover (no page number)
#    sect1 = Front matter (lowerRoman, start=1)
#    sect2 = Main content (decimal, start=1) — this is the existing body sectPr
# ---------------------------------------------------------------------------
existing_sectPr = body.find(W("sectPr"))
if existing_sectPr is None:
    raise RuntimeError("No body-level sectPr found")


def clone_and_clean(template):
    s = copy.deepcopy(template)
    for ref in s.findall(W("footerReference")):
        s.remove(ref)
    for ref in s.findall(W("headerReference")):
        s.remove(ref)
    for tag in ("pgNumType", "titlePg", "type"):
        for el in s.findall(W(tag)):
            s.remove(el)
    return s


sect0 = clone_and_clean(existing_sectPr)  # cover
sect1 = clone_and_clean(existing_sectPr)  # front matter

sect2 = existing_sectPr
for ref in sect2.findall(W("footerReference")):
    sect2.remove(ref)
for ref in sect2.findall(W("headerReference")):
    sect2.remove(ref)
for tag in ("pgNumType", "titlePg", "type"):
    for el in sect2.findall(W(tag)):
        sect2.remove(el)

# ---------------------------------------------------------------------------
# 4. Embed sect0 in p_before_lco's pPr, sect1 in p_before_lmd's pPr
# ---------------------------------------------------------------------------
def embed_sectpr(p, sectpr):
    pPr = p._p.find(W("pPr"))
    if pPr is None:
        pPr = etree.Element(W("pPr"))
        p._p.insert(0, pPr)
    for old in pPr.findall(W("sectPr")):
        pPr.remove(old)
    pPr.append(sectpr)


embed_sectpr(p_before_lco, sect0)
embed_sectpr(p_before_lmd, sect1)

# ---------------------------------------------------------------------------
# 5. Add page-numbering format + section-type to each sectPr.
#    Section 0 (cover): NO pgNumType displayed (no footer). type left default.
#    Section 1 (front matter): type=nextPage; lowerRoman start=1.
#    Section 2 (main): type=nextPage; decimal start=1.
# ---------------------------------------------------------------------------

def set_first_child(parent, child, preferred_order):
    """Insert child into parent at the first position that respects schema order."""
    inserted = False
    for i, existing in enumerate(list(parent)):
        tag = etree.QName(existing).localname
        if preferred_order.index(child.tag.split('}')[-1]) < preferred_order.index(tag) \
                if tag in preferred_order else False:
            parent.insert(i, child)
            inserted = True
            break
    if not inserted:
        parent.append(child)


def make_elem(tag, attrs=None, children=None):
    el = etree.SubElement(etree.Element("tmp"), W(tag))
    if attrs:
        for k, v in attrs.items():
            el.set(W(k), v)
    if children:
        for c in children:
            el.append(c)
    return el


# Section 1 (front matter): type=nextPage + pgNumType (lowerRoman, start=1)
type1 = etree.Element(W("type"))
type1.set(W("val"), "nextPage")
pgNum1 = etree.Element(W("pgNumType"))
pgNum1.set(W("fmt"), "lowerRoman")
pgNum1.set(W("start"), "1")

# Section 2 (main): type=nextPage + pgNumType (decimal, start=1)
type2 = etree.Element(W("type"))
type2.set(W("val"), "nextPage")
pgNum2 = etree.Element(W("pgNumType"))
pgNum2.set(W("fmt"), "decimal")
pgNum2.set(W("start"), "1")

# Schema order for sectPr children (subset, enough for our needs):
#   headerReference, footerReference, footnotePr, endnotePr, type, pgSz,
#   pgMar, paperSrc, pgBorders, lnNumType, pgNumType, cols, formProt, vAlign,
#   noEndnote, titlePg, textDirection, bidi, rtlGutter, docGrid, printerSettings, sectPrChange
SECT_PR_ORDER = [
    "headerReference", "footerReference", "footnotePr", "endnotePr", "type",
    "pgSz", "pgMar", "paperSrc", "pgBorders", "lnNumType", "pgNumType",
    "cols", "formProt", "vAlign", "noEndnote", "titlePg", "textDirection",
    "bidi", "rtlGutter", "docGrid", "printerSettings", "sectPrChange",
]


def insert_in_order(sect, new_el):
    """Insert new_el into sect respecting SECT_PR_ORDER."""
    new_name = etree.QName(new_el).localname
    new_pos = SECT_PR_ORDER.index(new_name)
    inserted = False
    for child in list(sect):
        name = etree.QName(child).localname
        if name in SECT_PR_ORDER and SECT_PR_ORDER.index(name) > new_pos:
            child.addprevious(new_el)
            inserted = True
            break
    if not inserted:
        sect.append(new_el)


# Section 0 (cover): no page numbering and no footer; leave type default.

# Section 1 (front matter): type=nextPage + pgNumType lowerRoman
insert_in_order(sect1, type1)
insert_in_order(sect1, pgNum1)

# Section 2 (main): type=nextPage + pgNumType decimal
insert_in_order(sect2, type2)
insert_in_order(sect2, pgNum2)

# ---------------------------------------------------------------------------
# 6. Create two footer parts:
#    - footer_num: centered PAGE field, Times New Roman, size 13
#    - footer_empty: empty (used for cover firstPage so cover stays unnumbered)
# ---------------------------------------------------------------------------
from docx.oxml import parse_xml
from docx.opc.constants import CONTENT_TYPE, RELATIONSHIP_TYPE
from docx.opc.part import Part
from docx.opc.packuri import PackURI

FTR_NUM_XML = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:pStyle w:val="Footer"/>
      <w:jc w:val="center"/>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="26"/>
        <w:szCs w:val="26"/>
      </w:rPr>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="26"/>
        <w:szCs w:val="26"/>
      </w:rPr>
      <w:fldChar w:fldCharType="begin"/>
    </w:r>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="26"/>
        <w:szCs w:val="26"/>
      </w:rPr>
      <w:instrText xml:space="preserve">PAGE  \\* MERGEFORMAT </w:instrText>
    </w:r>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="26"/>
        <w:szCs w:val="26"/>
      </w:rPr>
      <w:fldChar w:fldCharType="separate"/>
    </w:r>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="26"/>
        <w:szCs w:val="26"/>
      </w:rPr>
      <w:t>1</w:t>
    </w:r>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="26"/>
        <w:szCs w:val="26"/>
      </w:rPr>
      <w:fldChar w:fldCharType="end"/>
    </w:r>
  </w:p>
</w:ftr>
'''

FTR_EMPTY_XML = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:pStyle w:val="Footer"/>
      <w:jc w:val="center"/>
    </w:pPr>
  </w:p>
</w:ftr>
'''

# Find an unused partname for new footers
existing_parts = doc.part.package.parts
used_uris = {p.partname for p in existing_parts}


def next_footer_uri():
    n = 1
    while True:
        uri = PackURI(f"/word/footer{n}.xml")
        if uri not in used_uris:
            used_uris.add(uri)
            return uri
        n += 1


def add_footer_part(xml_text):
    uri = next_footer_uri()
    part = Part(
        uri,
        CONTENT_TYPE.WML_FOOTER,
        xml_text.encode("utf-8"),
        doc.part.package,
    )
    return part


ftr_num_part = add_footer_part(FTR_NUM_XML)
ftr_empty_part = add_footer_part(FTR_EMPTY_XML)

# Relate them to the document part (each gets a rId on the main document part)
rid_num = doc.part.relate_to(ftr_num_part, RELATIONSHIP_TYPE.FOOTER)
rid_empty = doc.part.relate_to(ftr_empty_part, RELATIONSHIP_TYPE.FOOTER)

print(f"Footer num rId:   {rid_num}")
print(f"Footer empty rId: {rid_empty}")

# ---------------------------------------------------------------------------
# 7. Add footerReference elements to each section
# ---------------------------------------------------------------------------
def make_footer_ref(rid, ref_type):
    fr = etree.Element(W("footerReference"))
    fr.set(W("type"), ref_type)
    fr.set(f"{{{R_NS}}}id", rid)
    return fr


# Section 0 (cover): only reference the empty footer so no number ever shows.
sect0.insert(0, make_footer_ref(rid_empty, "default"))

# Section 1 (front matter): default footer = numbered (roman, set by pgNumType)
sect1.insert(0, make_footer_ref(rid_num, "default"))

# Section 2 (main): default footer = numbered (decimal, set by pgNumType)
sect2.insert(0, make_footer_ref(rid_num, "default"))

# ---------------------------------------------------------------------------
# 8. Replace empty MUC LUC area with TOC field that updates on open.
#    MUC LUC heading is at idx_muc_luc; the very next paragraph is currently
#    a page break (separator before DANH MUC HINH ANH). Insert TOC paragraph
#    AFTER MUC LUC heading and BEFORE that page-break paragraph.
# ---------------------------------------------------------------------------
p_after_muc_luc = paragraphs[idx_muc_luc + 1]  # currently the page-break para

toc_xml = f'''<w:p xmlns:w="{W_NS}">
  <w:pPr>
    <w:spacing w:before="120" w:after="120"/>
    <w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
      <w:sz w:val="26"/>
      <w:szCs w:val="26"/>
    </w:rPr>
  </w:pPr>
  <w:r>
    <w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
      <w:sz w:val="26"/>
      <w:szCs w:val="26"/>
    </w:rPr>
    <w:fldChar w:fldCharType="begin" w:dirty="true"/>
  </w:r>
  <w:r>
    <w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
      <w:sz w:val="26"/>
      <w:szCs w:val="26"/>
    </w:rPr>
    <w:instrText xml:space="preserve">TOC \\o "1-3" \\h \\z \\u</w:instrText>
  </w:r>
  <w:r>
    <w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
      <w:sz w:val="26"/>
      <w:szCs w:val="26"/>
    </w:rPr>
    <w:fldChar w:fldCharType="separate"/>
  </w:r>
  <w:r>
    <w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
      <w:sz w:val="26"/>
      <w:szCs w:val="26"/>
    </w:rPr>
    <w:t xml:space="preserve">Nhấn F9 hoặc mở lại bằng Word để cập nhật Mục lục.</w:t>
  </w:r>
  <w:r>
    <w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
      <w:sz w:val="26"/>
      <w:szCs w:val="26"/>
    </w:rPr>
    <w:fldChar w:fldCharType="end"/>
  </w:r>
</w:p>'''

toc_para = parse_xml(toc_xml)
p_muc_luc._p.addnext(toc_para)
print("Inserted TOC field after MUC LUC heading")

# ---------------------------------------------------------------------------
# 9. Force fields to update when Word opens the document (so the TOC and the
#    PAGE fields in footers refresh automatically).
# ---------------------------------------------------------------------------
settings = doc.settings.element
# w:updateFields must come early in settings; insert as the first child if
# absent.
existing_update = settings.find(W("updateFields"))
if existing_update is None:
    update = etree.Element(W("updateFields"))
    update.set(W("val"), "true")
    settings.insert(0, update)
    print("Inserted <w:updateFields w:val='true'/> into settings.xml")
else:
    existing_update.set(W("val"), "true")
    print("Set <w:updateFields w:val='true'/> on existing element")

# ---------------------------------------------------------------------------
# 10. Save
# ---------------------------------------------------------------------------
doc.save(DST)
print("Saved:", DST)
