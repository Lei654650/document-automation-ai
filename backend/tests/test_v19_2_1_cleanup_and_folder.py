from pathlib import Path
import zipfile

from app.engines.job_engine import _compact_worksheet_xml, _clean_xlsx


def test_compaction_keeps_business_coordinates_and_removes_trailing_noise():
    xml = b'''<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:XFD100"/><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Title</t></is></c><c r="B1" s="1"/><c r="Z1" s="2"/></row><row r="2"><c r="A2"><v>123</v></c><c r="Z2" s="2"/></row><row r="100"><c r="XFD100" s="2"/></row></sheetData></worksheet>'''
    cleaned, stats = _compact_worksheet_xml(xml)
    assert b'r="A1"' in cleaned
    assert b'r="A2"' in cleaned
    assert b'r="Z1"' not in cleaned
    assert b'r="XFD100"' not in cleaned
    assert b'<dimension ref="A1:A2"/>' in cleaned
    assert stats["phantom_cells_removed"] >= 2


def test_clean_xlsx_preserves_non_worksheet_package_parts(tmp_path: Path):
    source = tmp_path / "source.xlsx"
    output = tmp_path / "output.xlsx"
    worksheet = b'''<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:XFD1"/><sheetData><row r="1"><c r="A1"><v>7</v></c><c r="XFD1" s="2"/></row></sheetData></worksheet>'''
    with zipfile.ZipFile(source, "w") as archive:
        archive.writestr("xl/worksheets/sheet1.xml", worksheet)
        archive.writestr("xl/styles.xml", b"STYLE-BYTES")
        archive.writestr("xl/media/image1.png", b"IMAGE-BYTES")
    stats = _clean_xlsx(source, output)
    with zipfile.ZipFile(output) as archive:
        assert archive.testzip() is None
        assert archive.read("xl/styles.xml") == b"STYLE-BYTES"
        assert archive.read("xl/media/image1.png") == b"IMAGE-BYTES"
        assert b'r="A1"' in archive.read("xl/worksheets/sheet1.xml")
        assert b'r="XFD1"' not in archive.read("xl/worksheets/sheet1.xml")
    assert stats["structure_changed"] is True
