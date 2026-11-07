import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedWorkflowCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#047857"))
        
        # Don't draw header on page 1
        if self._pageNumber > 1:
            self.drawString(36, 810, "AsetKu — Panduan Alur Kerja (Workflow) Sistem untuk Semua Pengguna")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawRightString(559, 810, "Bahasa Praktis & Mudah Dipahami")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(36, 804, 559, 804)
            
        # Running Footer
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 32, 559, 32)
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(36, 22, "AsetKu: Sistem Manajemen Inventaris, Sewa & Keuangan Otomatis • Panduan Awam")
        page_text = f"Halaman {self._pageNumber} dari {page_count}"
        self.drawRightString(559, 22, page_text)
            
        self.restoreState()

def build_workflow_pdf(filename="docs/PANDUAN_ALUR_DAN_WORKFLOW_ASETKU.pdf"):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=40,
        bottomMargin=42
    )

    styles = getSampleStyleSheet()
    
    # Color Palette
    c_primary = colors.HexColor("#0F172A")    # Dark Navy
    c_accent = colors.HexColor("#047857")     # Emerald Green
    c_teal = colors.HexColor("#0D9488")       # Teal
    c_sub = colors.HexColor("#334155")        # Slate Text
    c_bg_light = colors.HexColor("#F8FAFC")   # Light grey bg
    c_border = colors.HexColor("#E2E8F0")     # Light border
    c_box_bg = colors.HexColor("#F0FDF4")     # Light green box
    c_box_border = colors.HexColor("#86EFAC")

    # Typography Styles
    title_style = ParagraphStyle(
        'WfTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=19,
        textColor=c_primary,
        spaceAfter=3
    )
    
    subtitle_style = ParagraphStyle(
        'WfSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=c_accent,
        spaceAfter=5
    )
    
    h1_style = ParagraphStyle(
        'WfH1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=11.5,
        leading=14.5,
        textColor=c_primary,
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'WfH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12.5,
        textColor=c_accent,
        spaceBefore=5,
        spaceAfter=2,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'WfBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.2,
        leading=11.8,
        textColor=c_sub,
        spaceAfter=3.5
    )

    body_bold = ParagraphStyle(
        'WfBodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    step_box_title = ParagraphStyle(
        'WfStepTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    step_box_desc = ParagraphStyle(
        'WfStepDesc',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=10.8,
        textColor=c_sub
    )

    table_cell = ParagraphStyle(
        'WfTableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=11,
        textColor=c_sub
    )

    table_header = ParagraphStyle(
        'WfTableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.white
    )

    story = []

    # =========================================================================
    # HALAMAN 1: PENGENALAN SISTEM & ALUR UTAMA SEWA ASET
    # =========================================================================
    banner_data = [
        [Paragraph("<b>PANDUAN ALUR & WORKFLOW SISTEM ASETKU</b>", title_style)],
        [Paragraph("<b>Memahami Cara Kerja Aplikasi Peminjaman Aset & Keuangan Otomatis dengan Bahasa yang Mudah dan Ramah untuk Semua Pengguna</b>", subtitle_style)],
        [Paragraph("Dokumen panduan ini ditujukan bagi mahasiswa, penyewa umum, staf kantor, maupun penguji untuk memahami alur kerja sistem dari awal hingga akhir tanpa istilah teknis yang rumit.", body_style)]
    ]
    banner_table = Table(banner_data, colWidths=[523])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_bg_light),
        ('BOX', (0,0), (-1,-1), 1, c_accent),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 6))

    story.append(Paragraph("1. MENGENAL ASETKU DALAM BAHASA SEDERHANA", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.75, color=c_accent, spaceBefore=1, spaceAfter=4))
    
    story.append(Paragraph(
        "<b>Bayangkan AsetKu seperti gabungan dari 4 hal praktis:</b><br/>"
        "1. <b>Katalog Toko Online:</b> Anda bisa melihat foto, spesifikasi, dan ketersediaan barang (laptop, kamera, proyektor, kendaraan) secara langsung.<br/>"
        "2. <b>Buku Peminjaman Digital:</b> Mengatur jadwal sewa agar barang tidak pernah dipinjam oleh dua orang pada hari yang sama (anti-bentrok).<br/>"
        "3. <b>Dompet Digital (AsetKu Wallet):</b> Tempat penampung dana otomatis jika pesanan Anda ditolak/batal, uang 100% aman dan bisa ditarik kembali.<br/>"
        "4. <b>Kasir & Akuntan Otomatis:</b> Setiap uang sewa, biaya denda, biaya servis alat, atau gaji karyawan otomatis dicatat rapi ke buku kas tanpa perlu diketik manual.",
        body_style
    ))
    story.append(Spacer(1, 4))

    story.append(Paragraph("2. ALUR 1: BAGAIMANA CARA MENYEWA BARANG DI ASETKU?", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.75, color=c_accent, spaceBefore=1, spaceAfter=4))
    
    sewa_steps = [
        [
            Paragraph("<b>Langkah 1: Pilih Barang di Katalog</b>", step_box_title),
            Paragraph("<b>Langkah 2: Cek Kalender Ketersediaan</b>", step_box_title),
            Paragraph("<b>Langkah 3: Atur Tanggal & Keranjang</b>", step_box_title)
        ],
        [
            Paragraph("Buka menu Katalog. Cari barang yang ingin disewa berdasarkan nama, kode alat, atau kategori (Laptop, Kamera, dll).", step_box_desc),
            Paragraph("Klik tombol detail untuk melihat kalender. Jika tanggal berwarna abu-abu/terkunci, berarti barang sudah dibooking orang lain.", step_box_desc),
            Paragraph("Tentukan tanggal mulai dan selesai sewa. Sistem langsung menghitung total biaya sewa + opsi asuransi + PPN 11% secara transparan.", step_box_desc)
        ],
        [
            Paragraph("<b>Langkah 4: Bayar & Upload Bukti</b>", step_box_title),
            Paragraph("<b>Langkah 5: Verifikasi & Persetujuan</b>", step_box_title),
            Paragraph("<b>Langkah 6: Serah Terima Barang</b>", step_box_title)
        ],
        [
            Paragraph("Pilih metode pembayaran (Transfer Bank, QRIS, Saldo Dompet, atau Tunai). Jika transfer, wajib unggah foto bukti transfer.", step_box_desc),
            Paragraph("Staf gudang/admin memeriksa bukti bayar. Jika sah, pesanan disetujui dan penyewa menerima notifikasi di layar akun.", step_box_desc),
            Paragraph("Penyewa datang ke gudang mengambil barang. Staf mencetak Berita Acara Serah Terima (BAST), status barang berubah jadi 'Dipinjam'.", step_box_desc)
        ]
    ]
    sewa_table = Table(sewa_steps, colWidths=[174, 174, 175])
    sewa_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_accent),
        ('BACKGROUND', (0,2), (-1,2), c_teal),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('BACKGROUND', (0,1), (-1,1), colors.white),
        ('BACKGROUND', (0,3), (-1,3), colors.white),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(sewa_table)
    story.append(Spacer(1, 4))

    # =========================================================================
    # HALAMAN 2: PENGEMBALIAN, DENDA, REFUND DOMPET & JUAL BELI
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph("3. ALUR 2: BAGAIMANA CARA PENGEMBALIAN BARANG & PENGECEKAN KONDISI?", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.75, color=c_accent, spaceBefore=1, spaceAfter=4))
    
    story.append(Paragraph(
        "Saat masa sewa selesai, penyewa mengembalikan barang ke gudang. Staf gudang akan memeriksa fisik barang dengan 3 kemungkinan:",
        body_style
    ))

    kondisi_rows = [
        [Paragraph("Hasil Pengecekan Fisik", table_header), Paragraph("Kondisi Barang & Waktu", table_header), Paragraph("Tindakan Sistem & Akibat Finansial", table_header)],
        [
            Paragraph("<b>Skenario A: Mulus & Tepat Waktu</b>", table_cell),
            Paragraph("Barang kembali dalam kondisi baik tanpa cacat dan dikembalikan sesuai tanggal perjanjian.", table_cell),
            Paragraph("Status sewa ditandai <b>Selesai</b>. Barang langsung berstatus <i>Tersedia (available)</i> di katalog dan siap dipesan oleh orang lain. Kuitansi lunas terbit.", table_cell)
        ],
        [
            Paragraph("<b>Skenario B: Terlambat Mengembalikan</b>", table_cell),
            Paragraph("Penyewa mengembalikan barang lewat dari batas tanggal yang disepakati.", table_cell),
            Paragraph("Sistem otomatis menghitung: <b>Jumlah Hari Terlambat x Tarif Denda Harian</b> (mis. Rp 10.000/hari). Denda ini otomatis dicatat ke buku kas sebagai pendapatan denda.", table_cell)
        ],
        [
            Paragraph("<b>Skenario C: Barang Rusak / Cacat</b>", table_cell),
            Paragraph("Barang tergores parah, pecah, atau tidak berfungsi normal saat diperiksa staf.", table_cell),
            Paragraph("Staf menginput biaya perbaikan (denda kerusakan). Status barang otomatis berubah menjadi <b>Perlu Perawatan (maintenance)</b> sehingga tidak bisa disewa orang lain sampai diperbaiki.", table_cell)
        ]
    ]
    kondisi_table = Table(kondisi_rows, colWidths=[120, 145, 258])
    kondisi_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_accent),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(kondisi_table)
    story.append(Spacer(1, 6))

    story.append(Paragraph("4. ALUR 3: BAGAIMANA JIKA PESANAN DITOLAK? (REFUND DOMPET OTOMATIS)", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.75, color=c_accent, spaceBefore=1, spaceAfter=4))
    
    story.append(Paragraph(
        "<b>Penyewa tidak perlu khawatir uangnya hilang jika pesanan tidak disetujui admin.</b><br/>"
        "• Jika pesanan ditolak (misal: barang mendadak perlu servis mendesak), sistem <b>otomatis mengembalikan dana 100%</b> ke dalam <b>Saldo Dompet AsetKu</b> penyewa.<br/>"
        "• <b>Pilihan Penggunaan Saldo Dompet:</b><br/>"
        "  1. <i>Dipakai Sewa Lagi:</i> Saldo bisa langsung dipakai untuk menyewa barang lain tanpa perlu repot transfer uang lagi.<br/>"
        "  2. <i>Ditarik ke Rekening Bank:</i> Penyewa bisa mengajukan penarikan dana ke nomor rekening bank pribadinya. "
        "Untuk keamanan maksimal, penarikan dana wajib memasukkan <b>PIN 6-digit</b> (salah 5 kali, dompet terkunci 15 menit).",
        body_style
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("5. ALUR 4: BAGAIMANA CARA KERJA JUAL-BELI ASET?", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.75, color=c_accent, spaceBefore=1, spaceAfter=4))
    story.append(Paragraph(
        "Selain disewakan, aset kantor yang sudah memasuki masa peremajaan atau dilepas dapat dibeli oleh pengguna:<br/>"
        "• <b>Keranjang Beli Mandiri:</b> Pembelian tidak memerlukan durasi sewa harian. Begitu pembeli mengajukan pembelian, "
        "stok barang langsung <b>dikunci otomatis (Status Terjual)</b> sehingga tidak bisa dibeli atau disewa orang lain.<br/>"
        "• <b>Pembayaran & Penyerahan:</b> Pembeli membayar via transfer/dompet/tunai. Setelah diverifikasi, admin mencetak Struk Penjualan resmi dan menyerahkan hak milik barang.",
        body_style
    ))

    # =========================================================================
    # HALAMAN 3: PEMBUKUAN OTOMATIS & MODUL KARYAWAN
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph("6. ALUR 5: BAGAIMANA LAPORAN KEUANGAN TERCATAT OTOMATIS?", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.75, color=c_accent, spaceBefore=1, spaceAfter=4))
    
    story.append(Paragraph(
        "Di AsetKu, <b>bagian keuangan tidak perlu mengetik pemasukan dan pengeluaran satu per satu di buku kas</b>. "
        "Sistem bekerja seperti asisten akuntan pintar yang mencatat uang secara otomatis saat ada kejadian nyata:",
        body_style
    ))

    kas_flow = [
        [Paragraph("Kejadian di Dunia Nyata", table_header), Paragraph("Bagaimana Komputer Mencatatnya?", table_header), Paragraph("Manfaat bagi Bisnis & Kantor", table_header)],
        [
            Paragraph("<b>Penyewa Bayar Sewa Laptop Rp 555.000</b>", table_cell),
            Paragraph("Komputer memecah otomatis:<br/>• Rp 500.000 $\rightarrow$ Pendapatan Bersih Sewa<br/>• Rp 55.000 $\rightarrow$ PPN 11% (titipan pajak negara)", table_cell),
            Paragraph("Laba bersih perusahaan tidak tercampur dengan utang pajak yang wajib disetor ke kas negara.", table_cell)
        ],
        [
            Paragraph("<b>Kantor Beli Printer Baru Rp 3.000.000</b>", table_cell),
            Paragraph("Tercatat otomatis sebagai 'Belanja Modal' (Capex). Nilai printer tiap bulan disusutkan nilainya di Neraca.", table_cell),
            Paragraph("Pimpinan tahu berapa total aset kantor yang sesungguhnya dimiliki setiap saat.", table_cell)
        ],
        [
            Paragraph("<b>Servis LCD Proyektor Rp 200.000</b>", table_cell),
            Paragraph("Tercatat otomatis sebagai 'Beban Perawatan Aset' (Opex) saat teknisi selesai bekerja.", table_cell),
            Paragraph("Ketahuan aset mana yang sering rusak dan menghabiskan banyak biaya servis.", table_cell)
        ],
        [
            Paragraph("<b>Penyewa Bayar Denda Telat Rp 50.000</b>", table_cell),
            Paragraph("Tercatat otomatis sebagai 'Pemasukan Denda' pada saat check-in barang.", table_cell),
            Paragraph("Tidak ada uang denda yang bocor atau lupa disetorkan oleh staf gudang.", table_cell)
        ],
        [
            Paragraph("<b>Pesanan Dibatalkan Rp 555.000</b>", table_cell),
            Paragraph("Tercatat otomatis sebagai 'Kas Keluar Refund' dan uang masuk ke Dompet penyewa.", table_cell),
            Paragraph("Buku kas tetap seimbang (*balance*) tanpa ada selisih uang gantung.", table_cell)
        ],
    ]
    kas_table = Table(kas_flow, colWidths=[130, 185, 208])
    kas_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_accent),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(kas_table)
    story.append(Spacer(1, 6))

    story.append(Paragraph("7. ALUR 6: BAGAIMANA MODUL LEMBUR, REIMBURSE & GAJI BEKERJA?", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.75, color=c_accent, spaceBefore=1, spaceAfter=4))
    
    story.append(Paragraph(
        "AsetKu juga mempermudah urusan internal karyawan yang terhubung langsung ke laporan kas kantor:<br/>"
        "• <b>Lembur Otomatis Masuk Gaji:</b> Karyawan mengisi form lembur dan mengunggah foto saat bekerja lembur. "
        "Admin menyetujui, dan nilai rupiahnya dihitung otomatis menggunakan formula resmi Depnaker. "
        "Saat admin membuat slip gaji bulanan, uang lembur tersebut **otomatis masuk sendiri** ke slip gaji tanpa perlu hitung kalkulator.<br/>"
        "• <b>Klaim Reimburse Nota:</b> Karyawan yang membeli bensin dinas atau konsumsi rapat cukup memotret nota kuitansi. "
        "Begitu admin mentransfer pembayaran, kas kantor langsung membukukan pengeluaran 'Reimburse Karyawan' beserta lampiran fotonya.",
        body_style
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("8. KESIMPULAN WORKFLOW UNTUK SEMUA KALANGAN", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.75, color=c_accent, spaceBefore=1, spaceAfter=4))
    story.append(Paragraph(
        "Dengan alur kerja terpadu ini, <b>AsetKu memberikan rasa aman bagi penyewa</b> (jadwal pasti, uang aman via dompet refund) "
        "dan <b>memberikan kemudahan mutlak bagi pengelola kantor</b> (stok terpantau, riwayat servis tercatat, dan laporan keuangan terbit otomatis setiap detik tanpa repot pembukuan manual).",
        body_style
    ))

    # Build Document
    doc.build(story, canvasmaker=NumberedWorkflowCanvas)
    print(f"Workflow PDF successfully built at: {filename}")

if __name__ == "__main__":
    out_file = sys.argv[1] if len(sys.argv) > 1 else "docs/PANDUAN_ALUR_DAN_WORKFLOW_ASETKU.pdf"
    build_workflow_pdf(out_file)
