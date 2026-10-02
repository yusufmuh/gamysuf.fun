"""Export the approved Markdown PRD into editable Word and print-ready PDF."""
from __future__ import annotations
import re
from html import escape
from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak, Table, TableStyle, KeepTogether

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'outputs' / 'heart-parade'
OUT.mkdir(parents=True, exist_ok=True)
TEXT = (ROOT / 'docs/PRD-Bipy-Heart-Parade.md').read_text(encoding='utf-8')
COVER = ROOT / 'hub/public/assets/covers/heart.jpg'

def clean(text: str) -> str:
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'\1 (\2)', text)
    return text.replace('**', '').replace('`', '')

def blocks(text: str) -> list[tuple[str, object]]:
    result: list[tuple[str, object]] = []
    lines = text.splitlines(); i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line: i += 1; continue
        if line.startswith('|'):
            rows: list[list[str]] = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                row = [clean(cell.strip()) for cell in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r'[: -]+', cell) for cell in row): rows.append(row)
                i += 1
            result.append(('table', rows)); continue
        kind = 'heading' if line.startswith('## ') else 'title' if line.startswith('# ') else 'bullet' if line.startswith('- ') else 'paragraph'
        result.append((kind, clean(line.removeprefix('## ').removeprefix('# ').removeprefix('- '))))
        i += 1
    return result

def export_word() -> None:
    doc = Document(); section = doc.sections[0]
    section.top_margin = section.bottom_margin = Inches(.65)
    section.left_margin = section.right_margin = Inches(.7)
    doc.styles['Normal'].font.name = 'Arial'; doc.styles['Normal'].font.size = Pt(10)
    doc.styles['Normal'].paragraph_format.space_after = Pt(7)
    for name in ['Title', 'Heading 1', 'Heading 2']:
        doc.styles[name].font.name = 'Arial'; doc.styles[name].font.color.rgb = RGBColor.from_string('B82D56')
    doc.add_heading('Bipy Grand Line Desire', 0)
    doc.add_paragraph('PRODUCT REQUIREMENTS DOCUMENT\nGame 05 / Gamysuf Arcade 1.7.0\n2 Oktober 2026')
    doc.add_picture(str(COVER), width=Inches(6.6))
    doc.add_paragraph('Dua pesona. Tujuh momen manis. Satu pengalaman Bpedia.', style='Subtitle')
    doc.add_page_break()
    for kind, value in blocks(TEXT):
        if kind == 'title': continue
        if kind == 'heading': doc.add_heading(str(value), level=1)
        elif kind == 'table':
            rows = value; table = doc.add_table(rows=1, cols=len(rows[0])); table.style = 'Light Shading Accent 1'
            for idx, cell in enumerate(rows[0]): table.rows[0].cells[idx].text = cell
            for row in rows[1:]:
                cells = table.add_row().cells
                for idx, cell in enumerate(row): cells[idx].text = cell
        else: doc.add_paragraph(str(value), style='List Bullet' if kind == 'bullet' else None)
    section.footer.paragraphs[0].text = 'GRAND LINE DESIRE  /  BPEDIA  /  GAME 2.2.1'
    doc.save(OUT / 'PRD-Bipy-Grand-Line-Desire.docx')

def export_pdf() -> None:
    pdfmetrics.registerFont(TTFont('DocArial', 'C:/Windows/Fonts/arial.ttf'))
    pdfmetrics.registerFont(TTFont('DocArialBold', 'C:/Windows/Fonts/arialbd.ttf'))
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle('BodyDoc', fontName='DocArial', fontSize=9.5, leading=14, spaceAfter=8, textColor=colors.HexColor('#382B2D'), wordWrap='CJK'))
    styles.add(ParagraphStyle('HeadDoc', fontName='DocArialBold', fontSize=15, leading=19, spaceBefore=16, spaceAfter=9, textColor=colors.HexColor('#B82D56'), keepWithNext=True))
    styles.add(ParagraphStyle('CellDoc', parent=styles['BodyDoc'], fontSize=8, leading=11, spaceAfter=0))
    styles.add(ParagraphStyle('TitleDoc', fontName='DocArialBold', fontSize=35, leading=42, textColor=colors.HexColor('#B82D56'), spaceAfter=18))
    story = [Spacer(1,30), Paragraph('Bipy<br/>Grand Line Desire',styles['TitleDoc']), Paragraph('PRODUCT REQUIREMENTS DOCUMENT<br/>Game 05 / Gamysuf Arcade 1.7.0<br/>2 Oktober 2026',styles['BodyDoc']), Spacer(1,18),Image(str(COVER),width=490,height=490*940/1440),Spacer(1,16),Paragraph('Dua pesona. Tujuh momen manis.<br/>Satu pengalaman Bpedia.',styles['HeadDoc']),PageBreak()]
    for kind,value in blocks(TEXT):
        if kind == 'title': continue
        if kind == 'table':
            rows = [[Paragraph(escape(str(cell)),styles['CellDoc']) for cell in row] for row in value]
            widths = [140,150,200] if len(rows[0]) == 3 else [104,143,160,83]
            table = Table(rows,colWidths=widths,repeatRows=1,hAlign='LEFT')
            table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#F6DED6')),('GRID',(0,0),(-1,-1),.4,colors.HexColor('#DCC6B9')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]));story.append(KeepTogether([table]))
        else: story.append(Paragraph(('• ' if kind == 'bullet' else '')+escape(str(value)),styles['HeadDoc' if kind=='heading' else 'BodyDoc']))
    def footer(canvas, doc) -> None:
        canvas.saveState();canvas.setFont('DocArial',8);canvas.setFillColor(colors.HexColor('#776362'));canvas.drawString(52,26,'GRAND LINE DESIRE / BPEDIA / 2 OKTOBER 2026');canvas.drawRightString(A4[0]-52,26,str(doc.page));canvas.restoreState()
    SimpleDocTemplate(str(OUT/'PRD-Bipy-Grand-Line-Desire.pdf'),pagesize=A4,rightMargin=52,leftMargin=52,topMargin=42,bottomMargin=43,title='PRD Bipy Grand Line Desire',author='Bpedia / Muhammad Yusuf').build(story,onFirstPage=footer,onLaterPages=footer)

if __name__ == '__main__':
    export_word(); export_pdf(); print(OUT)
