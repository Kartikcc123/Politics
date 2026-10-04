import fitz
import glob
import os

def find_voters_in_pdfs():
    print("=== SEARCHING IN ASSEMBLY PART 1 PDF ===")
    asm_files = glob.glob(r"D:\**\*1*.pdf", recursive=True) + glob.glob(r"C:\Users\Ashish Sharma\Downloads\**\*1*.pdf", recursive=True)
    
    # Search for Bheeta ward 1 PDF
    ward_files = glob.glob(r"C:\Users\Ashish Sharma\Downloads\**\bheeta*1*.pdf", recursive=True) + glob.glob(r"C:\Users\Ashish Sharma\Downloads\**\*भींटा*1*.pdf", recursive=True) + glob.glob(r"C:\Users\Ashish Sharma\Downloads\**\bhita*1*.pdf", recursive=True)
    
    print("Ward files found:", ward_files[:5])

find_voters_in_pdfs()
