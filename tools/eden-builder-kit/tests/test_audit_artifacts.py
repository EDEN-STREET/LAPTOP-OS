import importlib.util, hashlib, json, tempfile, unittest, zipfile
from pathlib import Path
spec=importlib.util.spec_from_file_location("artifact_audit",Path(__file__).resolve().parent.parent/"scripts"/"audit_artifacts.py")
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)
class ArchiveTests(unittest.TestCase):
    def example(self,unsafe=False,mismatch=False):
        with tempfile.NamedTemporaryFile(suffix=".zip",delete=False) as f:path=Path(f.name)
        self.addCleanup(lambda:path.unlink(missing_ok=True))
        contents=b"sample"
        inventory={"sourceCount":1,"files":[{"name":"example.txt","bytes":len(contents),"sha256":"0"*64 if mismatch else hashlib.sha256(contents).hexdigest()}]}
        with zipfile.ZipFile(path,"w") as z:
            z.writestr("originale/example.txt",contents)
            z.writestr("inventory/local_assets.json",json.dumps(inventory))
            if unsafe:z.writestr("../outside.txt","no")
        return path
    def test_archive_passes(self):
        r=audit.archive_check(self.example());self.assertTrue(r["valid"]);self.assertEqual(r["verified_count"],1)
    def test_hash_fails(self):
        self.assertFalse(audit.archive_check(self.example(mismatch=True))["valid"])
    def test_zip_slip_fails(self):
        r=audit.archive_check(self.example(unsafe=True));self.assertFalse(r["valid"]);self.assertEqual(r["unsafe_entries"],1)
if __name__=="__main__":unittest.main()
