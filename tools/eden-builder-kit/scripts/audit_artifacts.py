#!/usr/bin/env python3
"""Read-only EDEN artifact audit. Does not extract archives or print source names."""
import argparse,hashlib,json,pathlib,re,sys,zipfile

def archive_check(file):
    output={"archive_crc":"UNKNOWN","inventory_hashes":"NOT_PRESENT","source_count":None,"verified_count":None,"unsafe_entries":0}
    with zipfile.ZipFile(file) as z:
        infos=z.infolist()
        if len(infos)>10000 or sum(i.file_size for i in infos)>134217728:
            raise ValueError("Archive exceeds configured size limits")
        names=[i.filename for i in infos]
        output["member_count"]=len(names)
        output["unsafe_entries"]=sum(n.startswith("/") or chr(92) in n or ".." in pathlib.PurePosixPath(n).parts for n in names)
        output["duplicate_entries"]=len(names)-len(set(names))
        output["archive_crc"]="PASS" if z.testzip() is None else "FAIL"
        if "inventory/local_assets.json" in names:
            records=json.loads(z.read("inventory/local_assets.json"))
            entries=records.get("files",[])
            verified=0
            for entry in entries:
                target="originale/"+entry["name"]
                if target in names:
                    blob=z.read(target)
                    verified+=int(hashlib.sha256(blob).hexdigest()==entry["sha256"] and len(blob)==entry["bytes"])
            output["source_count"]=len(entries)
            output["verified_count"]=verified
            output["inventory_hashes"]="PASS" if verified==len(entries)==records.get("sourceCount") else "FAIL"
    output["valid"]=output["archive_crc"]=="PASS" and output["unsafe_entries"]==0 and output["duplicate_entries"]==0 and output["inventory_hashes"]!="FAIL"
    return output

def presentation_check(pptx,pdf,threshold):
    from pptx import Presentation
    import fitz
    slides=Presentation(str(pptx)).slides
    pages=fitz.open(str(pdf))
    result={"slides":len(slides),"pages":len(pages),"text_coverage":[],"visual_review":"REQUIRED"}
    token=lambda t:set(re.findall(r"\b[\wÄÖÜäöüß]{3,}\b",t.casefold()))
    for slide,page in zip(slides,pages):
        source=token(" ".join(shape.text for shape in slide.shapes if shape.has_text_frame))
        dest=token(page.get_text())
        result["text_coverage"].append(round(len(source&dest)/len(source) if source else 1,3))
    result["text_pass"]=len(slides)==len(pages) and all(v>=threshold for v in result["text_coverage"])
    return result

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--pptx",type=pathlib.Path)
    p.add_argument("--pdf",type=pathlib.Path)
    p.add_argument("--archive",type=pathlib.Path)
    p.add_argument("--minimum-coverage",type=float,default=0.85)
    a=p.parse_args()
    if bool(a.pptx)!=bool(a.pdf) or (not a.archive and not a.pptx):p.error("Provide --archive and/or --pptx with --pdf")
    result={"schemaVersion":"1.0.0","mode":"read_only"}
    if a.archive:result["archive"]=archive_check(a.archive)
    if a.pptx:result["presentation"]=presentation_check(a.pptx,a.pdf,a.minimum_coverage)
    print(json.dumps(result,ensure_ascii=False,indent=2))
    return 0 if ((not a.archive or result["archive"]["valid"]) and (not a.pptx or result["presentation"]["text_pass"])) else 2
if __name__=="__main__":sys.exit(main())
