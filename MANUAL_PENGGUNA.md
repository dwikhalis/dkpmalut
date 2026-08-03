# Manual Pengguna Pengelolaan Dataset dan Peta

## 1. Tentang manual ini

Manual ini menjelaskan alur pendaftaran akun, pemulihan password, serta pengelolaan dataset tabel dan peta pada portal DKP Maluku Utara. Nama tombol dan menu ditulis sesuai antarmuka aplikasi.

### Peran dan hak akses

| Peran | Hak akses umum |
|---|---|
| Pengunjung | Mendaftar, masuk, dan meminta reset password. |
| Partner | Mengelola dataset/peta miliknya sendiri. Partner dapat mengelola milik partner lain hanya jika pemilik memberikan izin yang sesuai. |
| Admin | Mengelola seluruh dataset/peta, mengatur akses partner, dan memproses status publikasi. |

Izin pada data yang dibagikan dapat dipisahkan menjadi **Tambah**, **Edit**, dan **Hapus**. Tombol yang tidak diizinkan dapat tidak muncul atau penyimpanan akan ditolak.

### Istilah yang digunakan

- **Dataset**: data tabular yang sumber utamanya berupa CSV.
- **Peta**: kumpulan satu atau lebih layer spasial dari GeoJSON/JSON atau CSV berkoordinat.
- **Edit**: mengubah isi data, feature, atau nilai yang sudah ada.
- **Update**: menyimpan perubahan metadata atau konfigurasi, seperti judul, label kolom, tipe kolom, legenda, dan visualisasi.
- **Publikasi**: proses terpisah dari penyimpanan. Data yang sudah disimpan belum otomatis tampil kepada publik.
- **Draft**: data sementara. Draft impor memiliki masa berlaku 7 hari dan dapat dibersihkan otomatis apabila tidak diselesaikan.

## 2. Daftar akun

### Prasyarat

- Pengguna memiliki alamat email yang aktif dan dapat membuka kotak masuk serta folder spam/junk.
- Browser mengizinkan pemuatan CAPTCHA Cloudflare Turnstile.
- Seluruh field formulir wajib diisi.

### Langkah pendaftaran

1. Buka halaman **Daftar** (`/daftar`).
2. Isi **Nama**.
3. Isi **Email** dengan format alamat email yang valid. Spasi di awal/akhir akan dihapus dan email disimpan dalam huruf kecil.
4. Isi **Organisasi**.
5. Isi **Password** minimal 6 karakter.
6. Isi **Konfirmasi Password** dengan nilai yang sama persis.
7. Selesaikan CAPTCHA.
8. Klik **Daftar**.
9. Setelah muncul halaman **Periksa Email Anda**, buka email konfirmasi yang dikirim sistem.
10. Periksa folder spam/junk apabila pesan tidak ada di kotak masuk, lalu ikuti tautan konfirmasi.
11. Kembali ke halaman **Masuk** dan login menggunakan akun yang telah dikonfirmasi.

### Constraint dan validasi

- Nama, email, organisasi, password, dan konfirmasi password tidak boleh kosong.
- Email harus mengikuti format umum `nama@domain.tld` dan tidak boleh mengandung spasi.
- Password minimal 6 karakter.
- Konfirmasi password harus sama persis, termasuk penggunaan huruf besar/kecil.
- CAPTCHA harus berhasil dan belum kedaluwarsa. Token CAPTCHA hanya berlaku untuk satu permintaan; bila gagal, selesaikan CAPTCHA yang baru.
- Tombol **Daftar** tidak aktif selama CAPTCHA belum selesai atau konfigurasi CAPTCHA tidak tersedia.
- Sistem sengaja menampilkan pesan keberhasilan yang sama untuk email baru maupun email yang mungkin sudah terdaftar. Hal ini mencegah pemeriksaan keberadaan akun oleh pihak lain.
- Terlalu banyak percobaan dapat terkena pembatasan sementara. Tunggu beberapa saat sebelum mencoba kembali.
- Akun yang belum dikonfirmasi tidak dapat digunakan untuk masuk.

### Jika pendaftaran gagal

- **Format email tidak valid**: periksa penulisan email.
- **Konfirmasi password belum sama**: ketik ulang kedua password.
- **CAPTCHA gagal/kedaluwarsa**: muat ulang CAPTCHA dan ulangi verifikasi.
- **Terlalu banyak percobaan**: tunggu sebelum mengirim ulang.
- **Masalah database/pendaftaran belum dapat diproses**: jangan mengirim berulang kali; coba kembali setelah beberapa saat.

## 3. Lupa password

Alur ini terdiri dari permintaan email reset dan pembuatan password baru.

### A. Meminta email reset

1. Buka halaman **Masuk** (`/masuk`).
2. Klik **Lupa password?**.
3. Isi alamat email akun.
4. Selesaikan CAPTCHA.
5. Klik **Kirim Email Reset Password**.
6. Sistem menampilkan pesan umum: jika email terdaftar, tautan reset akan dikirim.
7. Periksa kotak masuk dan folder spam/junk.

### B. Membuat password baru

1. Buka tautan reset dari email. Tautan mengarah ke `/reset-password`.
2. Tunggu sampai sistem selesai memeriksa sesi reset.
3. Isi **Password Baru**, minimal 6 karakter.
4. Isi **Konfirmasi Password** dengan nilai yang sama persis.
5. Klik **Perbarui Password**.
6. Setelah berhasil, sesi reset diakhiri. Masuk kembali menggunakan password baru.

### Constraint dan keamanan

- Email wajib diisi dan harus berformat valid.
- CAPTCHA wajib diselesaikan sebelum permintaan dikirim.
- Setelah permintaan, berlaku cooldown minimal 60 detik. Percobaan berulang menaikkan cooldown bertahap hingga maksimal 300 detik (5 menit). Menutup atau memuat ulang halaman tidak menghapus cooldown pada browser tersebut.
- Untuk keamanan, respons tidak mengungkap apakah email terdaftar.
- Tautan reset dapat menjadi tidak valid karena kedaluwarsa, sudah pernah digunakan, atau sesi reset tidak terbentuk dengan benar. Minta tautan baru bila itu terjadi.
- Password baru minimal 6 karakter dan kedua input harus sama persis.
- Gunakan hanya tautan dari email resmi portal. Jangan membagikan password atau tautan reset.

## 4. Mengakses pengelolaan data

1. Masuk dengan akun **Admin** atau **Partner** yang telah dikonfirmasi.
2. Buka **Profile** lalu halaman **Data** (`/profile/data`).
3. Pilih pemilik data bila pilihan tersebut tersedia.
4. Gunakan tombol **Tambah Dataset**, **Edit Dataset**, atau **Hapus Dataset**. Pada layar kecil, tombol tindakan tersedia melalui panel tindakan di bagian bawah.
5. Pada daftar, label `table` menunjukkan dataset dan label `peta` menunjukkan peta. Status publikasi ditampilkan terpisah.

Catatan: Partner pada data bersama hanya dapat menjalankan tindakan yang diberikan pemilik. Admin yang sedang berada pada lingkup pemilik lain tidak dapat membuat data dengan identitas yang tidak diizinkan oleh alur aplikasi.

## 5. Dataset tabel

### 5.1 Add — menambah dataset

1. Pada halaman Data, klik **Tambah Dataset**.
2. Pilih jenis **Tabel**.
3. Isi **Judul Dataset**. Jangan biarkan kosong dan jangan gunakan nama sementara `Draft`.
4. Tarik file CSV ke area unggah atau klik area tersebut untuk memilih file.
5. Setelah CSV dibaca, periksa jumlah baris dan daftar kolom.
6. Pada **Pilih Kolom yang Diimpor**, centang kolom yang diperlukan. Gunakan **Pilih Semua Kolom** atau **Hapus Semua Pilihan** bila sesuai.
7. Ubah **Nama Kolom** bila label yang dibaca dari CSV kurang jelas.
8. Periksa tipe otomatis (`text` atau `number`) dan preview maksimal 10 baris pertama.
9. Klik tombol **Simpan**.
10. Periksa ringkasan konfirmasi, lalu pilih **Ya**.

#### Constraint CSV dataset

- File harus berekstensi `.csv` dan dikenali sebagai CSV, Excel-compatible CSV, atau teks biasa.
- CSV harus memiliki header, minimal satu baris valid, dan minimal satu kolom yang dipilih.
- Baris kosong dilewati.
- Dataset tidak dapat disimpan bila tidak ada data valid, tidak ada kolom terpilih, judul kosong, atau judul masih `Draft` (tanpa membedakan huruf besar/kecil).
- Preview hanya menampilkan 10 baris; teks jumlah total menunjukkan jumlah data yang akan diimpor.
- Pemilihan file membuat draft otomatis. Selesaikan penyimpanan sebelum draft berumur 7 hari.
- Jika muncul **CSV terbaca, tetapi draft gagal disimpan**, jangan menganggap data sudah aman; coba simpan ulang setelah koneksi pulih.
- Menyimpan dataset tidak otomatis memublikasikannya.

### 5.2 Edit — mengubah isi dan struktur dataset

1. Pilih dataset berlabel `table` dari daftar, lalu klik **Edit**.
2. Ubah nilai langsung melalui input pada sel tabel. Sel kosong ditampilkan kosong tanpa tulisan `N/A`.
3. Untuk mengganti nama kolom, ubah nama pada input header.
4. Klik **+ Tambah Kolom** di sisi kanan tabel untuk membuat kolom baru.
5. Pilih **Text** atau **Angka** untuk menentukan tipe isi kolom baru.
6. Klik **+ Tambah Baris** di bawah tabel, lalu isi minimal satu sel pada baris baru.
7. Gunakan ikon tempat sampah pada header untuk menghapus kolom atau pada sisi kanan baris untuk menghapus baris.
8. Periksa indikator jumlah perubahan yang ditampilkan pada tombol **Simpan**.
9. Klik tombol **Simpan**, lalu pilih **Ya** pada dialog konfirmasi.
10. Jika baris baru berada pada halaman lain, tabel otomatis membuka pagination tempat baris tersebut tersimpan.

#### Constraint editor dataset

- Hanya pemilik, Admin, atau Partner dengan izin **Edit** yang dapat menyimpan.
- Nama header tidak boleh kosong dan tidak boleh sama dengan header lain tanpa membedakan huruf besar/kecil.
- Kolom bertipe **Angka** hanya menerima nilai numerik. Sel kosong tetap diperbolehkan.
- Tidak ada kolom tertentu yang wajib diisi. Namun, baris baru harus mempunyai minimal satu sel berisi data.
- Kolom baru hanya disimpan jika minimal satu sel pada kolom tersebut berisi data.
- Baris atau kolom baru yang seluruh selnya kosong tidak akan disimpan.
- Untuk mencegah hasil edit hilang ketika halaman tidak sengaja di-refresh, sistem menyimpan perubahan sementara dan memulihkannya saat halaman edit yang sama selesai dimuat kembali. Pemulihan mencakup perubahan nilai sel, nama header, tipe kolom, baris/kolom baru, serta pilihan penghapusan yang belum disimpan.
- Pemulihan setelah refresh bukan berarti perubahan telah tersimpan permanen. Pengguna tetap harus menekan tombol **Simpan** dan menyetujui konfirmasi agar perubahan diterapkan.
- Perubahan sementara dibersihkan setelah penyimpanan berhasil, pengguna menekan batal, atau berpindah ke halaman lain. Karena itu, jangan menggunakan tombol batal atau berpindah halaman jika perubahan masih ingin dilanjutkan.
- Dataset yang telah dipublikasikan tetap harus disimpan terlebih dahulu; perubahan publikasi mengikuti alur publikasi tersendiri.

### 5.3 Update — memperbarui judul dan konfigurasi dataset

1. Dari halaman Data, klik **Edit Dataset**.
2. Pilih dataset pada dropdown **Dataset / Peta**.
3. Ubah **Judul Dataset** bila diperlukan.
4. Untuk setiap kolom, ubah:
   - **Label**: nama yang ditampilkan kepada pengguna;
   - **Type**: `text` atau `number`;
   - **Align**: `left`, `center`, atau `right`.
5. Klik tombol **Simpan** dan pilih **Ya** pada konfirmasi.

Constraint:

- Harus ada dataset terpilih dan minimal satu perubahan.
- Judul tidak boleh kosong dan konfigurasi dataset harus memiliki kolom.
- **Key** kolom tidak dapat diubah dari layar ini; hanya label, tipe, dan perataan yang dapat diubah.
- Mengubah tipe menjadi `number` otomatis mengarahkan perataan ke kanan; pastikan nilai lama sesuai dengan tipe baru.
- Partner hanya dapat memperbarui dataset tabel miliknya melalui layar konfigurasi ini.

### 5.4 Delete — menghapus dataset atau data di dalamnya

#### Menghapus seluruh dataset

1. Klik **Hapus Dataset**.
2. Centang satu atau beberapa dataset. Kotak pada header memilih semua item yang terlihat dalam lingkup daftar.
3. Verifikasi **Label**, **Pemilik**, dan **Jumlah Data**.
4. Klik **Hapus (n)**.
5. Pada dialog konfirmasi, pilih **Ya**.

#### Menghapus baris tertentu

1. Buka dataset tabel.
2. Klik **Hapus Data**.
3. Pilih baris yang akan dihapus.
4. Klik **Hapus (n)** dan konfirmasi.

Constraint dan dampak:

- Minimal satu item harus dipilih.
- Partner hanya dapat menghapus data miliknya atau data yang secara eksplisit memiliki izin **Hapus**.
- Penghapusan seluruh dataset menghilangkan konfigurasi dan data terkait. Tindakan ini tidak menyediakan pemulihan mandiri di antarmuka.
- Periksa nama pemilik dan jumlah data sebelum mengonfirmasi, terutama saat memilih semua.

## 6. Peta

### 6.1 Add — membuat peta atau menambah layer

#### Membuat peta dari GeoJSON

1. Klik **Tambah Dataset**, lalu pilih **Peta**.
2. Isi **Judul Peta**; jangan gunakan `Draft` sebagai judul akhir.
3. Pilih tab **GeoJSON**.
4. Tarik file ke area unggah atau klik untuk memilih file.
5. Tunggu file dibaca dan draft dibuat.
6. Klik tombol **Simpan** dan konfirmasi **Ya**.

#### Membuat peta titik dari CSV

1. Pada form tambah peta, pilih tab **CSV**.
2. Unggah file `.csv` yang memiliki header dan kolom koordinat.
3. Pilih kolom **Latitude** dan **Longitude**. Kolom **X/Y** dapat dipakai apabila benar-benar merepresentasikan longitude/latitude.
4. Pastikan ada baris dengan koordinat numerik yang valid.
5. Isi judul, klik **Simpan**, lalu konfirmasi.

#### Menambah layer ke peta yang sudah ada

1. Buka peta dari daftar.
2. Klik **Tambah Layer** atau **Tambah**.
3. Unggah GeoJSON/JSON atau CSV berkoordinat.
4. Tinjau file, lalu simpan dan konfirmasi.

#### Constraint file peta

- GeoJSON harus berekstensi `.geojson` atau `.json`, bertipe `application/geo+json` atau `application/json`, dan berisi objek **FeatureCollection** yang valid.
- Ukuran GeoJSON harus lebih dari 0 byte dan maksimal **50 MB**.
- Geometri dapat berupa titik, garis, poligon, atau campuran yang dapat dibaca aplikasi.
- CSV harus berekstensi `.csv`, memiliki header, baris valid, dan kolom latitude/longitude yang berisi angka.
- Pembuatan dari CSV gagal bila kolom koordinat belum dipilih, terdapat kondisi koordinat fatal, atau tidak ada satu pun baris dengan koordinat valid.
- Judul wajib diisi dan tidak boleh tetap bernilai `Draft`.
- Pemilik data harus tersedia dan pengguna harus memiliki peran Admin/Partner serta izin **Tambah** untuk peta bersama.
- Draft peta juga berlaku 7 hari. Selesaikan pembuatan agar tidak dibersihkan otomatis.
- Layer baru menambah jumlah feature dan memperluas bounds peta secara otomatis.

### 6.2 Edit — mengubah feature/data peta

1. Buka peta, lalu buka tampilan dataset/layer.
2. Klik **Edit**.
3. Pilih layer yang akan diedit.
4. Ubah nilai properti feature langsung pada tabel.
5. Ubah nama kolom melalui input header bila diperlukan.
6. Klik **+ Tambah Kolom**, kemudian pilih tipe **Text** atau **Angka** untuk kolom baru.
7. Klik **+ Tambah Baris** untuk membuat feature baru.
8. Untuk feature titik baru, isi nilai latitude dan longitude.
9. Gunakan ikon tempat sampah untuk menghapus kolom atau baris. Ikon hapus tidak tersedia pada kolom koordinat.
10. Klik tombol **Simpan** dan konfirmasi.

Constraint:

- Harus ada peta dan layer yang valid.
- Sumber layer harus masih tersedia agar koleksi hasil edit dapat diunggah ulang.
- Partner memerlukan izin **Edit** untuk peta bersama.
- Nama header tidak boleh kosong atau duplikat.
- Isi kolom baru harus sesuai dengan tipe **Text** atau **Angka** yang dipilih.
- Feature titik baru wajib memiliki latitude dan longitude yang valid.
- Baris atau kolom baru hanya disimpan jika setidaknya satu sel berisi data.
- Untuk mencegah hasil edit hilang ketika halaman tidak sengaja di-refresh, perubahan feature, header, baris, dan kolom yang belum disimpan akan dipulihkan saat halaman edit peta yang sama selesai dimuat kembali.
- Pemulihan setelah refresh bukan penyimpanan permanen. Pengguna tetap harus menekan tombol **Simpan** dan menyetujui konfirmasi.
- Perubahan sementara dibersihkan setelah simpan berhasil, batal, atau berpindah halaman. Jangan menekan batal atau berpindah halaman bila perubahan masih ingin dilanjutkan.
- Penyimpanan menulis ulang GeoJSON layer terkait. Jangan keluar sebelum proses selesai.
- Perubahan data feature berbeda dari perubahan gaya/legenda; gaya disimpan melalui alur visualisasi.

### 6.3 Update — judul, legenda, visualisasi, dan publikasi peta

#### Update judul dasar

1. Klik **Edit Dataset** pada halaman daftar.
2. Pilih item peta dari dropdown **Dataset / Peta**.
3. Ubah **Judul Peta**.
4. Klik tombol **Simpan** dan konfirmasi.

#### Update visualisasi dan legenda

1. Buka peta dan masuk ke menu visualisasi/legenda.
2. Pilih layer serta field pengelompokan utama/subkelompok.
3. Atur label legenda, warna isi/garis, ketebalan, transparansi, pattern, ukuran titik/ikon, visibilitas awal, popup, dan tabel sesuai kebutuhan.
4. Untuk feature titik, atur **Ukuran** dalam `px`. Ukuran default titik dan gambar adalah **14 px**.
5. Untuk menambahkan radius pada feature titik, isi **Buffer / Radius** dan pilih satuan `m` atau `km`.
6. Jika nilai buffer lebih dari 0, pilih warna radius dan atur transparansinya.
7. Gunakan preview untuk memeriksa hasil. Refresh preview dapat digunakan untuk melihat perubahan yang belum disimpan.
8. Klik **Simpan Visualisasi** atau tombol update yang tersedia, lalu konfirmasi.

Constraint visualisasi:

- Opsi field mengikuti property key yang tersedia pada layer.
- Buffer/radius hanya berlaku untuk feature bertipe titik.
- Ukuran titik menggunakan satuan piksel, sedangkan buffer/radius menggunakan meter atau kilometer.
- Rentang kontrol UI harus dipatuhi; contoh pattern: ketebalan 0,5–6 px, opacity 0–1, dan jarak 4–24 px.
- Ikon legenda hanya menerima SVG atau PNG, maksimal **512 KB**.
- Simpan visualisasi sebelum melanjutkan publikasi.
- Pada data yang sudah terbit, tombol dapat berlabel **Update** dan perubahan publikasi tetap memerlukan konfirmasi.

#### Mengajukan/update publikasi

1. Buka menu **Publikasi**.
2. Isi judul, tag, cakupan wilayah, deskripsi, gambar, dan lampiran yang diperlukan.
3. Pilih minimal satu kabupaten/kota cakupan bila field tersebut diwajibkan oleh form.
4. Ajukan publikasi.
5. Partner menunggu persetujuan Admin. Status dapat berupa `requested`, `approved`, `rejected`, atau belum dipublikasikan.

Catatan: penyimpanan data dan pengajuan publikasi adalah dua aksi berbeda. Status **approved** berarti tampil publik; **requested** menunggu peninjauan; **rejected** perlu diperbaiki dan diajukan kembali.

### 6.4 Delete — menghapus feature, layer, atau seluruh peta

#### Menghapus feature

1. Buka peta dan klik **Hapus Data**.
2. Pilih layer.
3. Centang satu atau beberapa feature.
4. Klik hapus dan periksa jumlah feature pada dialog.
5. Pilih **Ya**.

#### Menghapus layer

1. Buka peta dan klik **Hapus Layer**.
2. Pilih layer, lalu aktifkan pilihan penghapusan seluruh layer bila tersedia.
3. Klik hapus.
4. Pastikan nama layer pada dialog benar, lalu pilih **Ya**.

#### Menghapus seluruh peta

1. Dari daftar Data, klik **Hapus Dataset**.
2. Pilih item berlabel `peta`.
3. Klik **Hapus (n)** dan konfirmasi.

Constraint dan dampak:

- Minimal satu feature atau satu layer harus dipilih.
- Menghapus feature menulis ulang file layer, memperbarui jumlah feature, property key, dan bounds peta.
- Menghapus layer juga mencoba menghapus file sumber GeoJSON dari penyimpanan.
- Menghapus seluruh peta menghapus metadata serta relasi layer/legenda. Tidak ada fitur undo mandiri.
- Partner memerlukan izin **Hapus** dan tidak dapat menghapus milik partner lain tanpa grant tersebut.
- Jika layer terakhir dihapus, peta dapat tersisa tanpa data spasial; periksa kembali sebelum konfirmasi.

## 7. Praktik aman dan pemecahan masalah

- Simpan salinan CSV/GeoJSON asli sebelum melakukan edit atau hapus.
- Gunakan judul yang spesifik, misalnya mencakup topik, wilayah, dan periode.
- Validasi koordinat CSV: latitude umumnya berada pada rentang -90 hingga 90 dan longitude -180 hingga 180.
- Hindari mengganti label kolom menjadi nama yang sama karena dapat membingungkan pembaca, walaupun key internal tetap berbeda.
- Jika tombol simpan menampilkan `(0)`, belum ada perubahan valid atau data belum siap.
- Jika baris baru tidak terlihat setelah disimpan, periksa pagination. Tabel akan membuka halaman tempat baris baru berada.
- Jika baris baru tidak dapat disimpan, pastikan minimal satu sel pada baris tersebut telah diisi.
- Jika muncul peringatan header, pastikan tidak ada nama header kosong atau duplikat.
- Jika nilai ditolak pada kolom **Angka**, hapus karakter selain angka dan periksa format desimalnya.
- Jika sesi berakhir atau muncul **Unauthorized**, masuk kembali sebelum mengulang unggahan.
- Jika muncul **Forbidden/Lokasi file peta tidak diizinkan**, periksa pemilik data dan grant Tambah/Edit/Hapus.
- Jika unggahan GeoJSON ditolak, periksa ekstensi, MIME type, struktur FeatureCollection, ukuran maksimal 50 MB, dan koneksi.
- Jika perubahan berhasil disimpan tetapi belum terlihat publik, periksa status publikasi; penyimpanan bukan persetujuan publikasi.
- Setelah tindakan destruktif, muat ulang daftar dan cocokkan jumlah data/layer.

## 8. Checklist cepat sebelum menyimpan

### Dataset

- [ ] Judul terisi dan bukan `Draft`.
- [ ] CSV valid, memiliki header dan data.
- [ ] Minimal satu kolom dipilih.
- [ ] Tipe dan label kolom sudah benar.
- [ ] Tidak ada nama header yang kosong atau duplikat.
- [ ] Setiap baris baru memiliki minimal satu sel berisi data.
- [ ] Setiap kolom baru memiliki minimal satu sel berisi data.
- [ ] Nilai pada kolom **Angka** menggunakan format numerik.
- [ ] Jumlah perubahan pada tombol sesuai.
- [ ] Pemilik dan hak akses sudah benar.

### Peta

- [ ] Judul terisi dan bukan `Draft`.
- [ ] GeoJSON berupa FeatureCollection valid dan tidak lebih dari 50 MB, atau CSV memiliki koordinat valid.
- [ ] Layer yang dipilih benar.
- [ ] Header feature tidak kosong atau duplikat.
- [ ] Feature titik baru memiliki latitude dan longitude yang valid.
- [ ] Ukuran titik, buffer/radius, warna, dan transparansi sudah diperiksa.
- [ ] Legenda dan preview sudah diperiksa.
- [ ] Visualisasi sudah disimpan sebelum publikasi.
- [ ] Item dan jumlah yang akan dihapus sudah diverifikasi.
