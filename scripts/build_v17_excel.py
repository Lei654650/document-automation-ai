from artifact_tool import Workbook, SpreadsheetFile
from datetime import datetime, timedelta
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/'Enterprise_Test_Suite'/'02_Excel'
ROOT.mkdir(parents=True,exist_ok=True)

def build(name, rows=320, sheets=3):
    wb=Workbook.create()
    for sidx in range(sheets):
        sh=wb.worksheets.add(f'Data_{sidx+1}')
        sh.get_range('A1:J1').values=[['ID','Part No.','Description','Qty','Unit Price','Subtotal','Status','Owner','Due Date','Variance']]
        vals=[]; base=datetime(2026,1,1)
        for i in range(1,rows+1):
            vals.append([i,f'PN-{sidx+1:02d}-{i:05d}',f'Automation component {i} / 零件 {i}',(i%17)+1,round(2.5+(i%83)*1.37,2),None,['Open','Approved','Hold'][i%3],['Engineering','Quality','Production'][i%3],base+timedelta(days=i%365),None])
        sh.get_range(f'A2:J{rows+1}').values=vals
        sh.get_range('F2').formulas=[['=D2*E2']]; sh.get_range(f'F2:F{rows+1}').fill_down()
        sh.get_range('J2').formulas=[['=F2-ROUND(F2*0.97,2)']]; sh.get_range(f'J2:J{rows+1}').fill_down()
        sh.freeze_panes.freeze_rows(1)
        sh.get_range('A1:J1').format={'fill':'#1F4E78','font':{'bold':True,'color':'#FFFFFF'},'wrap_text':True}
        sh.get_range(f'D2:F{rows+1}').format.number_format='#,##0.00'
        sh.get_range(f'I2:I{rows+1}').format.number_format='yyyy-mm-dd'
        sh.get_range(f'G2:G{rows+1}').data_validation={'rule':{'type':'list','values':['Open','Approved','Hold']}}
        sh.get_range(f'F2:F{rows+1}').conditional_formats.add_data_bar({'color':'#4472C4','gradient':True})
        sh.get_range('A:J').format.column_width=16; sh.get_range('C:C').format.column_width=30
        sh.tables.add(f'A1:J{rows+1}',True,f'Table{sidx+1}')
    SpreadsheetFile.export_xlsx(wb).save(str(ROOT/name))

build('01_Complex_BOM_MultiSheet.xlsx',360,4)
build('02_Production_KPI_Formulas.xlsx',320,3)
build('03_Inventory_Traceability.xlsx',340,4)
print('created 3 workbooks')
