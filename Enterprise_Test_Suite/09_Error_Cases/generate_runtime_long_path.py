from pathlib import Path
root=Path('runtime_long_path')
name='segment_'+'x'*45
p=root
for _ in range(6): p=p/name
p.mkdir(parents=True,exist_ok=True)
(p/'long_path_test.pdf').write_bytes(b'%PDF-1.4\n% runtime long path fixture')
print(p)
