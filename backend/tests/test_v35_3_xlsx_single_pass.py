from pathlib import Path
import zipfile

from app.engines import job_engine


class _FakeClient:
    def __init__(self, *args, **kwargs):
        self.source_language_code = "zh"
        self.target_language_code = "zh-vi"
        self.bilingual_layout = "inline"
        self.persistent_cache_hits = 0

    def translate_many(self, texts):
        return [f"VI {text}" for text in texts]

    def invalidate(self, texts):
        return None


def test_publish_xlsx_preserves_every_source_part(tmp_path, monkeypatch):
    source = tmp_path / "source.xlsx"
    destination = tmp_path / "source_zh-vi.xlsx"
    with zipfile.ZipFile(source, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", "<Types/>")
        zf.writestr("xl/workbook.xml", "<workbook/>")
        zf.writestr("xl/sharedStrings.xml", '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>中文</t></si></sst>')
        zf.writestr("xl/worksheets/sheet1.xml", '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"/>')
    with zipfile.ZipFile(source, "r") as archive:
        job_engine._publish_xlsx_package(source, destination, archive, {})
    with zipfile.ZipFile(source, "r") as before, zipfile.ZipFile(destination, "r") as after:
        assert set(before.namelist()) == set(after.namelist())
        assert after.testzip() is None
        assert "xl/sharedStrings.xml" in after.namelist()


def test_main_xlsx_path_does_not_call_second_full_package_repair(tmp_path, monkeypatch):
    source = tmp_path / "source.xlsx"
    destination = tmp_path / "source_zh-vi.xlsx"
    ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
    with zipfile.ZipFile(source, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", "<Types/>")
        zf.writestr("xl/workbook.xml", f'<workbook xmlns="{ns}"/>')
        zf.writestr("xl/styles.xml", f'<styleSheet xmlns="{ns}"><cellXfs count="1"><xf/></cellXfs></styleSheet>')
        zf.writestr("xl/sharedStrings.xml", f'<sst xmlns="{ns}"><si><t>启动</t></si></sst>')
        zf.writestr("xl/worksheets/sheet1.xml", f'<worksheet xmlns="{ns}"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row></sheetData></worksheet>')

    monkeypatch.setattr(job_engine, "TranslationClient", _FakeClient)
    monkeypatch.setattr(job_engine, "_repair_xlsx_placeholder_corruption", lambda path: (_ for _ in ()).throw(AssertionError("second rewrite called")))
    monkeypatch.setattr(job_engine, "_validate_xlsx_delivery_guard", lambda path: {})
    job_engine._translate_xlsx(source, destination, _FakeClient(), None, {"bilingual_layout": "inline"})
    with zipfile.ZipFile(destination, "r") as output:
        assert output.testzip() is None
        assert "xl/sharedStrings.xml" in output.namelist()
