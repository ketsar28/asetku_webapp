import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
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
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Don't draw header on page 1 (cover / banner page)
        if self._pageNumber > 1:
            self.drawString(36, 810, "AsetKu — Dokumentasi Arsitektur, Evaluasi MVP & Spesifikasi Penyesuaian")
            self.drawRightString(559, 810, "PPPTIK IF701 | Kelompok 7")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(36, 804, 559, 804)
            
        # Running Footer on all pages
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 32, 559, 32)
        self.drawString(36, 22, "Universitas Siber Asia (UNSIA) — Informatika PJJ S1 • Ganjil 2026/2027")
        page_text = f"Halaman {self._pageNumber} dari {page_count}"
        self.drawRightString(559, 22, page_text)
            
        self.restoreState()

def build_pdf(filename="docs/DOKUMENTASI_LENGKAP_ASETKU_DAN_PENYESUAIAN_FITUR.pdf"):
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
    
    # Custom Palette
    c_primary = colors.HexColor("#0F172A")    # Dark Slate
    c_accent = colors.HexColor("#047857")     # Emerald Green
    c_sub = colors.HexColor("#334155")        # Slate Text
    c_bg_light = colors.HexColor("#F8FAFC")   # Light grey bg
    c_border = colors.HexColor("#E2E8F0")     # Light border
    c_alert_bg = colors.HexColor("#ECFDF5")   # Light emerald bg
    c_alert_border = colors.HexColor("#10B981")

    # Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=c_primary,
        spaceAfter=3
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=c_accent,
        spaceAfter=6
    )
    
    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=c_primary,
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
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
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11.5,
        textColor=c_sub,
        spaceAfter=3
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10.5,
        textColor=c_sub
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.white
    )

    alert_box_style = ParagraphStyle(
        'AlertBox',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=11,
        textColor=colors.HexColor("#065F46")
    )

    story = []

    # =========================================================================
    # HALAMAN 1: IDENTITAS PROYEK & EVALUASI KOMPARASI MVP PROPOSAL
    # =========================================================================
    banner_data = [
        [Paragraph("<b>DOKUMENTASI SISTEM & SPESIFIKASI PENYESUAIAN FITUR</b>", title_style)],
        [Paragraph("<b>AsetKu</b> — Sistem Manajemen Inventaris dan Penyewaan Aset Terintegrasi dengan Pelaporan Keuangan Otomatis Berbasis Web", subtitle_style)],
        [Paragraph("<b>Mata Kuliah:</b> Perancangan & Pengelolaan Proyek TIK (PPPTIK) • <b>Kelas:</b> IF701 • <b>Semester:</b> Ganjil 2026/2027<br/><b>Program Studi:</b> Informatika PJJ S1 — Universitas Siber Asia (UNSIA) • <b>Kelompok:</b> 7", body_style)]
    ]
    banner_table = Table(banner_data, colWidths=[523])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_bg_light),
        ('BOX', (0,0), (-1,-1), 1, c_accent),
        ('PADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 6))

    story.append(Paragraph("1. IDENTITAS PROYEK & ANGGOTA KELOMPOK 7", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.75, color=c_accent, spaceBefore=1, spaceAfter=4))
    
    team_data = [
        [Paragraph("No", table_header), Paragraph("Nama Mahasiswa", table_header), Paragraph("NIM", table_header), Paragraph("Tanggung Jawab Utama", table_header)],
        [Paragraph("1", table_cell), Paragraph("<b>M. Zidan Khalil Gibran</b>", table_cell), Paragraph("230401070209", table_cell), Paragraph("Mengembangkan fitur peminjaman aset, sistem dompet refund, dan integrasi database", table_cell)],
        [Paragraph("2", table_cell), Paragraph("<b>Handika Nur Ichsan</b>", table_cell), Paragraph("230401070201 (*)", table_cell), Paragraph("Menyusun dokumentasi sistem, panduan alur pengguna, dan materi laporan proyek", table_cell)],
        [Paragraph("3", table_cell), Paragraph("<b>Ibrahim Saleh Siregar</b>", table_cell), Paragraph("230401070203 (*)", table_cell), Paragraph("Mengembangkan modul pencatatan keuangan, perhitungan kas otomatis, dan ekspor laporan", table_cell)],
        [Paragraph("4", table_cell), Paragraph("<b>M. Ketsar Ali Abi Wahid</b>", table_cell), Paragraph("230401070204", table_cell), Paragraph("Merancang antarmuka (UI/UX) katalog aset, formulir pemesanan, dan halaman pembayaran", table_cell)],
        [Paragraph("5", table_cell), Paragraph("<b>Rizaldi</b>", table_cell), Paragraph("250401020121", table_cell), Paragraph("Melakukan pengujian alur sistem (testing), validasi transaksi, dan uji keamanan PIN dompet", table_cell)],
    ]
    team_table = Table(team_data, colWidths=[20, 125, 80, 298])
    team_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_accent),
        ('ALIGN', (0,0), (0,-1), 'CENTER'),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
    ]))
    story.append(team_table)
    story.append(Paragraph("<font size='6.8' color='#64748B'><i>(*) Catatan: Harap cantumkan NIM resmi rekan Handika & Ibrahim pada file proposal docx sebelum pengumpulan akhir.</i></font>", body_style))
    story.append(Spacer(1, 6))

    story.append(Paragraph("2. EVALUASI KOMPARASI: JANJI PROPOSAL (MVP) VS REALITA SISTEM", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.75, color=c_accent, spaceBefore=1, spaceAfter=4))
    
    story.append(Paragraph(
        "Berdasarkan dokumen proposal <b>T1_PPPTIK_KEL07_IF701_ASETKU.docx</b>, kelompok menjanjikan 4 Luaran Minimum (MVP). "
        "Hasil audit verifikasi kode sumber membuktikan <b>seluruh 4 MVP telah tercapai 100%</b>:",
        body_style
    ))

    mvp_data = [
        [Paragraph("Prioritas MVP Proposal", table_header), Paragraph("Fungsi & Luaran yang Dijanjikan", table_header), Paragraph("Realisasi Arsitektur Sistem Saat Ini", table_header), Paragraph("Status", table_header)],
        [
            Paragraph("<b>MVP 1</b><br/>Booking Anti-Bentrok", table_cell),
            Paragraph("Penyewa memilih aset, tanggal sewa, hitungan biaya sewa, asuransi, dan PPN otomatis tanpa bentrok.", table_cell),
            Paragraph("• Kalender interaktif (AvailabilityCalendar.tsx)<br/>• Validasi jadwal bentrok di API (loans/route.ts)<br/>• Kalkulasi otomatis DPP, Asuransi, & PPN 11%", table_cell),
            Paragraph("<font color='#047857'><b>100% Selesai</b></font>", table_cell)
        ],
        [
            Paragraph("<b>MVP 2</b><br/>Pembayaran & Verifikasi", table_cell),
            Paragraph("Penyewa memilih rekening transfer, mengunggah bukti bayar, memantau status pesanan secara transparan.", table_cell),
            Paragraph("• Form pembayaran multi-channel (Bank, QRIS, Tunai)<br/>• Upload bukti bayar dengan validasi format server<br/>• Notifikasi in-app otomatis ke penyewa & admin", table_cell),
            Paragraph("<font color='#047857'><b>100% Selesai</b></font>", table_cell)
        ],
        [
            Paragraph("<b>MVP 3</b><br/>Approval & Refund Dompet", table_cell),
            Paragraph("Admin approve/reject. Jika ditolak, saldo otomatis refund ke dompet penyewa dan dapat ditarik dengan PIN.", table_cell),
            Paragraph("• One-click approve/reject & refund atomik di DB<br/>• Saldo Dompet bertambah instan tanpa human error<br/>• Penarikan saldo ke bank diamankan PIN 6-digit", table_cell),
            Paragraph("<font color='#047857'><b>100% Selesai</b></font>", table_cell)
        ],
        [
            Paragraph("<b>MVP 4</b><br/>Serah Terima & Buku Kas", table_cell),
            Paragraph("Pencatatan status serah terima/kembali barang & pencatatan otomatis transaksi uang ke laporan kas (PDF/Excel).", table_cell),
            Paragraph("• Handover & Check-in fisik + denda telat/rusak<br/>• Otomatis split-journaling ke buku kas utama<br/>• Ekspor laporan Excel (.xlsx) & print-ready view", table_cell),
            Paragraph("<font color='#047857'><b>100% Selesai</b></font>", table_cell)
        ],
    ]
    mvp_table = Table(mvp_data, colWidths=[80, 145, 235, 63])
    mvp_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_accent),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
        ('ALIGN', (-1,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
    ]))
    story.append(mvp_table)
    story.append(Spacer(1, 5))

    alert_data = [[
        Paragraph(
            "<b>KESIMPULAN TECH LEAD:</b> Sistem saat ini telah melampaui (overshoot) proposal dengan menghadirkan modul "
            "<b>Jual-Beli Aset</b> (stock locking), <b>Pemeliharaan Aset</b>, <b>Stock Opname</b>, <b>HR Lembur Depnaker & Reimburse</b>, "
            "serta <b>8 Pilar Keuangan Korporat</b> (Neraca Aset, Amortisasi Akrual, Rekonsiliasi Bank, dan Audit Trail).",
            alert_box_style
        )
    ]]
    alert_table = Table(alert_data, colWidths=[523])
    alert_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_alert_bg),
        ('BOX', (0,0), (-1,-1), 0.75, c_alert_border),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(alert_table)

    # =========================================================================
    # HALAMAN 2: SPESIFIKASI PENYESUAIAN FITUR OPERASIONAL (A s.d. G)
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph("3. SPESIFIKASI PENYESUAIAN & PENYEMPURNAAN FITUR OPERASIONAL", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.75, color=c_accent, spaceBefore=1, spaceAfter=5))
    
    story.append(Paragraph(
        "Untuk memastikan keandalan tinggi, menghilangkan ambiguitas UX, dan menyelaraskan dengan kebutuhan praktis, "
        "berikut adalah spesifikasi penyesuaian yang diterapkan:",
        body_style
    ))

    features = [
        (
            "A. Penghapusan Fitur QR Code (QR Scanner & QR Generator)",
            "• <b>Latar Belakang:</b> Menghilangkan ketergantungan pada hardware kamera eksternal dan mengurangi friksi teknis di lapangan.<br/>"
            "• <b>Penyesuaian:</b> Komponen pemindai kamera (QrScanner) dan visualisasi QR pada katalog/detail dinonaktifkan. "
            "Sistem beralih sepenuhnya ke pencarian Kode Aset alfanumerik unik (mis. <i>AST-LPT-001</i>) dan Nomor Seri pabrikan yang lebih andal."
        ),
        (
            "B. Penambahan Akses Modul Tim Facility: Menu Perawatan Aset",
            "• <b>Latar Belakang:</b> Divisi Facility bertanggung jawab langsung atas pemeliharaan fisik sarana, gedung, dan peralatan.<br/>"
            "• <b>Penyesuaian:</b> Memperluas role-based access control (RBAC) pada middleware dan menu navigasi agar akun "
            "berjabatan Facility (mis. <i>budi@asetku.org</i>, <i>agus@asetku.org</i>) memiliki wewenang membuka modul <b>Perawatan Aset</b>, "
            "mencatat kerusakan, memilih vendor servis, dan menyelesaikan perbaikan secara mandiri."
        ),
        (
            "C. Mandatory Bukti Transfer & Penandaan Asterisk (*) pada Semua Input Wajib",
            "• <b>Latar Belakang:</b> Mencegah lolosnya pesanan transfer fiktif tanpa bukti dan memperjelas affordance formulir bagi user.<br/>"
            "• <b>Penyesuaian:</b><br/>"
            "  1. Pada alur checkout pembayaran Non-Tunai (Transfer Bank), berkas bukti unggah menjadi <b>wajib (mandatory)</b>.<br/>"
            "  2. Setiap label input formulir yang bersifat wajib di seluruh aplikasi dilengkapi simbol bintang merah mencolok "
            "(<font color='#DC2626'><b>*</b></font>) agar penyewa dan staf memahami field prasyarat sebelum submit."
        ),
        (
            "D. Proteksi Modal / Dialog Box / Drawer (No Backdrop Auto-Close)",
            "• <b>Latar Belakang:</b> Mencegah kehilangan data formulir secara tidak sengaja ketika kursor mengklik area luar jendela dialog.<br/>"
            "• <b>Penyesuaian:</b> Menonaktifkan penutupan modal otomatis pada event klik backdrop background (overlay). "
            "Dialog hanya dapat ditutup secara sadar apabila pengguna menekan tombol <b>[Batal]</b>, <b>[Tutup]</b>, atau ikon <b>[X]</b> di pojok kanan atas."
        ),
        (
            "E. Fitur Killer: Kartu Finansial Aset (Asset Financial Ledger)",
            "• <b>Latar Belakang:</b> Menjadi representasi visual paling nyata bahwa Inventaris telah <b>TERINTEGRASI</b> dengan Keuangan.<br/>"
            "• <b>Komponen Data yang Ditampilkan di Detail Aset:</b><br/>"
            "  1. <b>Harga Beli Awal (Purchase Cost):</b> Nilai belanja modal (Capex) saat aset pertama kali diadakan.<br/>"
            "  2. <b>Nilai Buku Terkini (Current Book Value):</b> Nilai riil aset setelah dikurangi penyusutan garis lurus bulanan.<br/>"
            "  3. <b>Akumulasi Pendapatan Sewa:</b> Total rupiah yang berhasil dihasilkan aset dari seluruh riwayat sewa.<br/>"
            "  4. <b>Total Biaya Perawatan:</b> Akumulasi biaya servis, sparepart, dan vendor pemeliharaan aset.<br/>"
            "  5. <b>Kalkulasi Net ROI & Payback Period:</b> Indikator efisiensi modal (Laba Bersih vs Modal & Sisa bulan balik modal)."
        ),
        (
            "F. Penambahan Filter Transaksi per Aset di Laporan Arus Kas (/finance)",
            "• <b>Latar Belakang:</b> Memudahkan bagian keuangan menelusuri arus kas khusus per unit aset individual.<br/>"
            "• <b>Penyesuaian:</b> Menambahkan filter dropdown <b>'Pilih Aset'</b> pada halaman Arus Kas yang memanfaatkan "
            "foreign reference <i>asset_id</i> pada tabel <i>transactions</i>."
        ),
        (
            "G. Standardisasi Format Dokumen Cetak Resmi (BAST & Invoice)",
            "• <b>Latar Belakang:</b> Menghasilkan output dokumen legal formal yang siap diaudit oleh instansi/korporasi resmi.<br/>"
            "• <b>Penyesuaian:</b> Cetakan serah terima dan kuitansi dilengkapi penomoran dokumen baku:<br/>"
            "  • Format Berita Acara: <b>BAST/ASETKU/YYYY/MM/NOMOR</b><br/>"
            "  • Format Kuitansi Invoice: <b>INV/ASETKU/YYYY/MM/NOMOR</b><br/>"
            "  • Rincian Baku: Tarif Dasar Sewa (DPP), Premi Asuransi Proteksi, PPN 11%, Denda Keterlambatan/Kerusakan, & Total Lunas."
        )
    ]

    for title, desc in features:
        story.append(Paragraph(title, h2_style))
        story.append(Paragraph(desc, body_style))

    # =========================================================================
    # HALAMAN 3: ARSITEKTUR KEUANGAN OTOMATIS & 8 INSTRUMEN KEUANGAN
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph("4. ARSITEKTUR PELAPORAN KEUANGAN OTOMATIS (\"PEMBAYARAN SEMUA\")", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.75, color=c_accent, spaceBefore=1, spaceAfter=5))
    
    story.append(Paragraph(
        "Modul keuangan AsetKu dirancang dengan arsitektur <b>Event-Driven Automated Ledger</b> di mana setiap transaksi "
        "operasional otomatis menciptakan jurnal pembukuan pada tabel sentral <i>transactions</i> tanpa perantara manual.",
        body_style
    ))

    fin_rows = [
        [Paragraph("Kejadian Operasional", table_header), Paragraph("Pemicu Sistem (Trigger)", table_header), Paragraph("Pencatatan Otomatis pada Laporan Keuangan", table_header)],
        [
            Paragraph("<b>Pembayaran Sewa Lunas</b>", table_cell),
            Paragraph("Verifikasi transfer disetujui / Webhook Midtrans / Saldo Dompet dipotong", table_cell),
            Paragraph("<b>Uang Masuk:</b> Otomatis di-split menjadi 3 baris:<br/>1. Pendapatan Sewa (DPP)<br/>2. Premi Asuransi Barang<br/>3. PPN Keluaran 11% (kewajiban kas negara)", table_cell)
        ],
        [
            Paragraph("<b>Pembelian Aset Baru</b>", table_cell),
            Paragraph("Aset baru dibuat dengan nominal harga beli (purchaseCost)", table_cell),
            Paragraph("<b>Uang Keluar (Capex):</b> Kategori 'Pembelian aset' sebagai investasi modal perusahaan.", table_cell)
        ],
        [
            Paragraph("<b>Perawatan Aset</b>", table_cell),
            Paragraph("Staf gudang/facility menandai perbaikan selesai dengan biaya servis", table_cell),
            Paragraph("<b>Uang Keluar (Opex):</b> Kategori 'Perawatan aset' memotong kas operasional riil.", table_cell)
        ],
        [
            Paragraph("<b>Denda Telat / Rusak</b>", table_cell),
            Paragraph("Check-in barang di luar estimasi waktu atau terdeteksi rusak", table_cell),
            Paragraph("<b>Uang Masuk:</b> Kategori 'Denda keterlambatan' (hari x tarif) atau 'Denda kerusakan'.", table_cell)
        ],
        [
            Paragraph("<b>Refund Pesanan Batal</b>", table_cell),
            Paragraph("Pesanan ditolak admin setelah uang diterima", table_cell),
            Paragraph("<b>Uang Keluar:</b> Kategori 'Refund sewa/pembelian', dana dipindahkan ke Saldo Dompet.", table_cell)
        ],
        [
            Paragraph("<b>Pembayaran Gaji Karyawan</b>", table_cell),
            Paragraph("Admin membayar slip gaji bulanan (status draft → paid)", table_cell),
            Paragraph("<b>Uang Keluar:</b> Kategori 'Gaji karyawan' per nama & jabatan lengkap dengan nominal lembur.", table_cell)
        ],
        [
            Paragraph("<b>Pencairan Reimburse</b>", table_cell),
            Paragraph("Admin menyetujui klaim nota BBM/dinas karyawan", table_cell),
            Paragraph("<b>Uang Keluar:</b> Kategori 'Reimburse karyawan' sesuai foto struk/nota terunggah.", table_cell)
        ],
        [
            Paragraph("<b>Setoran Pajak PPN</b>", table_cell),
            Paragraph("Finance menginput bukti setoran pajak kas negara (NTPN)", table_cell),
            Paragraph("<b>Kas Keluar Pengurang Kewajiban:</b> Kategori 'Setoran PPN' (bukan beban operasional).", table_cell)
        ],
    ]
    fin_table = Table(fin_rows, colWidths=[120, 150, 253])
    fin_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_accent),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
    ]))
    story.append(fin_table)
    story.append(Spacer(1, 6))

    story.append(Paragraph("8 Instrumen Keuangan Korporat yang Tersedia (/finance):", h2_style))
    story.append(Paragraph(
        "<b>1. Arus Kas:</b> Filter tanggal, kategori, multi-bank/rekening, bar chart bulanan, ekspor Excel.<br/>"
        "<b>2. Analitik & Peringatan:</b> Amortisasi pendapatan bulanan (*accrual basis*), ROI aset, dan aging piutang.<br/>"
        "<b>3. Perpajakan:</b> Rekapitulasi SPT Masa PPN 11% dan porsi iuran BPJS perusahaan (8,24%).<br/>"
        "<b>4. Neraca & Penyusutan:</b> Depresiasi garis lurus per aset & neraca keseimbangan aset, kewajiban, dan ekuitas.<br/>"
        "<b>5. Anggaran (Budgeting):</b> Pagu anggaran belanja bulanan vs realisasi aktual.<br/>"
        "<b>6. Rekonsiliasi Bank:</b> Deteksi selisih saldo buku sistem vs rekening koran bank riil.<br/>"
        "<b>7. Tutup Buku:</b> Kunci periode pembukuan bulanan agar kebal dari manipulasi masa lalu.<br/>"
        "<b>8. Jejak Audit:</b> Rekaman tamper-evident seluruh pembatalan transaksi (VOID) dan persetujuan pengeluaran.",
        body_style
    ))

    # =========================================================================
    # HALAMAN 4: SINKRONISASI PROPOSAL & PANDUAN DEMO SIDANG
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph("5. CHECKLIST SINKRONISASI PROPOSAL & PANDUAN DEMO SIDANG", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.75, color=c_accent, spaceBefore=1, spaceAfter=5))
    
    story.append(Paragraph("A. 3 Poin Sinkronisasi Dokumen Proposal Resmi (T1_PPPTIK_KEL07_IF701_ASETKU.docx):", h2_style))
    story.append(Paragraph(
        "1. <b>Lengkapi NIM Anggota:</b> Pada tabel peran, isi NIM asli rekan Handika Nur Ichsan dan Ibrahim Saleh Siregar.<br/>"
        "2. <b>Sinkronkan Database:</b> Ubah keterangan teknologi dari <i>SQLite/PostgreSQL</i> menjadi <b>MySQL</b> (Laragon/Prisma) agar tidak menjadi celah pertanyaan teknis dosen.<br/>"
        "3. <b>Penegasan Ruang Lingkup:</b> Tegaskan bahwa 4 MVP utama proposal telah tercapai 100% dan didukung modul pelengkap.",
        body_style
    ))
    story.append(Spacer(1, 4))

    story.append(Paragraph("B. Skenario Demo 3 Langkah untuk Presentasi di Depan Penguji:", h2_style))
    
    demo_data = [
        [Paragraph("Langkah Demo", table_header), Paragraph("Aksi yang Dilakukan", table_header), Paragraph("Bukti / Output yang Ditunjukkan ke Dosen", table_header)],
        [
            Paragraph("<b>Skenario 1</b><br/>Anti-Bentrok Jadwal", table_cell),
            Paragraph("Buka katalog aset, klik salah satu aset sewa, dan pilih tanggal yang sudah dibooking penyewa lain.", table_cell),
            Paragraph("Tunjukkan <b>AvailabilityCalendar</b> bahwa tanggal tersebut nonaktif/terkunci dan API menolak pemesanan ganda.", table_cell)
        ],
        [
            Paragraph("<b>Skenario 2</b><br/>Refund Otomatis ke Dompet", table_cell),
            Paragraph("Ajukan sewa, simulasikan pembayaran transfer, lalu dari panel admin lakukan <b>Tolak Pesanan</b>.", table_cell),
            Paragraph("Buka menu Dompet penyewa: tunjukkan saldo bertambah seketika dan buku kas mencatat jurnal balik <i>Refund</i>.", table_cell)
        ],
        [
            Paragraph("<b>Skenario 3</b><br/>Pencairan Saldo & Keamanan", table_cell),
            Paragraph("Lakukan penarikan saldo dompet ke rekening bank menggunakan verifikasi PIN 6-digit.", table_cell),
            Paragraph("Buktikan PIN salah ditolak (proteksi brute force 5x) dan PIN benar sukses mengurangi saldo serta tercatat di mutasi kas.", table_cell)
        ],
    ]
    demo_table = Table(demo_data, colWidths=[95, 200, 228])
    demo_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_accent),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(demo_table)
    story.append(Spacer(1, 14))

    # Tanda Tangan / Lembar Pengesahan Ringkas
    closing_text = [
        [
            Paragraph("Disusun dan Diverifikasi oleh:<br/><b>Tim Pengembang AsetKu — Kelompok 7 IF701</b>", body_style),
            Paragraph("Jakarta, 7 November 2026<br/><b>Koordinator Proyek PPPTIK UNSIA</b>", body_style)
        ]
    ]
    closing_table = Table(closing_text, colWidths=[260, 263])
    closing_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(closing_table)

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully built at: {filename}")

if __name__ == "__main__":
    out_file = sys.argv[1] if len(sys.argv) > 1 else "docs/DOKUMENTASI_LENGKAP_ASETKU_DAN_PENYESUAIAN_FITUR.pdf"
    build_pdf(out_file)
