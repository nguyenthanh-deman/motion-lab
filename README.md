# Motion Lab — 70 hiệu ứng chuyển động

Website mô phỏng lại toàn bộ 70 template chuyển động của [animos.app/editor](https://animos.app/editor)
bằng canvas 2D thuần: không GSAP, không ba.js, không video, không thư viện ngoài.

Mỗi hiệu ứng chạy thật trong trình duyệt, chỉnh được tham số, tua được thời gian, xem toàn màn hình.

```
motion-lab/
├── index.html                  # trang duy nhất
├── css/style.css               # giao diện
├── js/lib.js                   # engine + helper vẽ + sinh poster
├── js/effects/
│   ├── 00-reference.js         # 6 hiệu ứng mẫu (chuẩn tham chiếu)
│   ├── 10-3d.js                # 10 · quả cầu, tường cong, trống quay, đường hầm
│   ├── 20-flow.js              # 9  · cover flow, bánh xe, vòng nghiêng
│   ├── 30-stream.js            # 9  · marquee, feed, wipe
│   ├── 40-grid.js              # 9  · lưới, camera lao vào, isometric
│   ├── 50-stack.js             # 9  · chồng, bóc, tung, xoè
│   ├── 60-orbit.js             # 8  · quỹ đạo, xoáy ốc, lấy nét
│   ├── 70-reveal.js            # 5  · lộ ảnh, tiêu điểm
│   └── 80-scene.js             # 5  · đa cảnh
├── SPEC-hieu-ung.md            # hợp đồng viết một hiệu ứng
└── README.md
```

## Chạy

Mở trực tiếp `index.html` (nhấp đúp). Không cần máy chủ, không cần cài gì.
Các tệp nạp bằng thẻ `<script>` thường nên `file://` chạy được.

## Cách hoạt động

Mỗi hiệu ứng là một `def` đăng ký vào `ML.defs`:

```js
ML.register({
  id: 'cover-flow', name: 'Cover Flow', vn: 'Thẻ xoay 3D', group: 'flow',
  desc: '…', duration: 14, slots: [5, 20],
  params: [ /* tham số hiển thị trong trình xem */ ],
  render({ ctx, t, w, h, u, p, imgs, n }) {
    // t: 0 → 1 rồi lặp; u = 1% cạnh ngắn; p = tham số; imgs = poster
  }
});
```

Ba hàm vẽ chính trong `js/lib.js`:

| Hàm | Việc |
|---|---|
| `H.card(ctx, img, x, y, w, h, radius, opts)` | ảnh phủ kín khung, bo góc, có bóng |
| `H.perspCard(ctx, img, cx, cy, cw, ch, yaw, opts)` | thẻ quay quanh trục dọc, vẽ từng cột nên phối cảnh đúng |
| `H.arcCard(ctx, img, cx, cy, ringR, angle, cw, ch, opts)` | thẻ uốn theo cung tròn (tường cong, quả cầu) |

Nhịp thời gian: `H.steps(t, n)` chia vòng lặp thành n cảnh, `H.stagger()` cho phần tử chạy lệch,
`H.back()` tạo độ nảy, `H.pulse()` tạo nhịp vào–giữ–ra.

Ảnh trong các hiệu ứng là **poster sinh tự động** (`ML.buildImages`), không tải từ mạng.

## Thư viện (70)

**3D & phối cảnh (13)** — Quả cầu thẻ (Card Globe), Cầu thẻ xoay (Orbit Globe), Trống thẻ đứng (Card Totem),
Dải phim cong (Film Strip), Đường hầm thẻ (Card Tunnel), Tường thẻ cong (Sphere Wall),
Thác thẻ cong (Sphere Cascade), Vòng thẻ nghiêng (Showcase Stream), Trống thẻ lệch (Parallax Totem),
Trống nhiều cột (Totem Wall), Xuyên chồng thẻ (Depth Stack Scroll), Xoáy thẻ (Vortex Spin), Xoáy ốc dọc (Spiral Stream).

**Vòng xoay & dòng chảy (18)** — Thẻ xoay ngang/dọc (Cover Flow), Vòng thẻ nghiêng (Cover Ring),
Vòng đu quay (Cover Ring Vertical), Băng thẻ lấy nét (Carousel Flow), Bánh xe nhích/quay (Wheel Carousel, Wheel Spin),
Vòm thẻ quay (Wheel Spin Bottom), Bài xoè chéo (Diagonal Carousel), Quỹ đạo phối cảnh (Orbit Showcase),
Cụm quay chậm (Photo Orbit), Quỹ đạo 3D (Orbit Carousel), Cánh hoa quay (Orbit Bloom),
Cuộn tin (Feed Scroll), Marquee nghiêng (Ticker Loop), Marquee nghiêng 3D (Ticker Tilt),
Băng mosaic (Mosaic Marquee), Ba cột trôi (Column Drift).

**Lưới & tường (15)** — Lưới bật nảy (Pop Grid), Lưới ráp dần (Grid Reveal), Lưới lật ô (Flip Grid),
Lao vào tường (Grid Dive), Zoom dải lưới (Grid Zoom Strip), Diễu hành bật (Pop Parade), Bậc thang chéo (Stairway),
Dải isometric (Iso Cascade), Chồng isometric (Iso Focus), Lưới isometric (Iso Orbit), Đổi vị trí (Position Dance),
Chồng trượt (Stack Slide), Bóc bài (Deck Peel), Xoè hàng/Xoè cột (Spread Rows, Spread Columns).

**Lộ & xoá (6)** — Ráp ô màn trập (Mosaic Wipe), Hai panel trượt (Split Reveal), Ráp dải (Stripe Reveal),
Mép chéo quét (Diagonal Wipe), Trôi Ken Burns (Zoom Parallax), Vệt ảnh (Image Trail).

**Tiêu điểm (5)** — Ô toả sáng (Spotlight Zoom), Sân khấu giữa (Center Stage), Ảnh nhỏ nở lớn (Focus Shift),
Bước zíc zắc (Focus Slider), Nền đổi theo (Hero Reel).

**Đa cảnh (13)** — Nở vòng rồi dải (Bloom Belt), Collage mở ra (Collage Reel), Ba cảnh (Triple Scene),
Xoè bài (Fan Shuffle), Lướt rồi xoay (Flyby Rolodex), Quay rồi lấy nét (Focus Orbit), Mắt cá mở vòng (Lens Orbit),
Quét rồi xoay (Sweep Ring), Tung thẻ (Card Toss), Bài xoè chéo (Cascade Deck), Rơi chồng (Cascade Drop),
Bung áp phích (Poster Burst), Mặt đồng hồ (Scatter Dial).

## Kiểm tra

Bộ QA (`_animos/qa.py`, cần Playwright) mở trang thật, rồi:

- `node --check` mọi tệp JS;
- đếm `ML.defs` (kỳ vọng 70) và id trùng;
- render từng hiệu ứng ở 4 mốc `t` trên canvas 420×300, đo độ phủ điểm ảnh (bắt canvas trắng);
- chụp ảnh trang, thư viện, trình xem và một bảng soát 70 khung.

Kết quả lần chạy cuối: **70 defs, 0 lỗi cú pháp, 0 lỗi console, 0 hiệu ứng trắng, 0 hiệu ứng đứng yên**
(soát 70 × 12 mốc thời gian bằng `_animos/qa_deep.py`).

```bash
python _animos/qa.py     # ảnh ra _animos/qa/
```

## Thêm một hiệu ứng

1. Đọc `SPEC-hieu-ung.md`.
2. Viết một `ML.register({...})` vào tệp nhóm phù hợp.
3. Thêm `<script>` vào `index.html` nếu là tệp mới.
4. Chạy QA để chắc không lỗi và canvas không trắng.

## Nguồn và giới hạn

- Tên, mô tả, số ảnh và bộ tham số lấy từ **metadata thật** trong bundle của animos.app
  (`_animos/templates.json`), dùng làm đặc tả thiết kế.
- Mã vẽ **viết lại** bằng canvas 2D; không sao chép mã render gốc.
- Đây là bản mô phỏng phục vụ học tập/demo, không phải sản phẩm của animos.
- Không có: xuất MP4/WebM, kéo thả ảnh của người dùng, lưu dự án. Ảnh là poster sinh tự động.
- Hiệu năng: lưới chỉ vẽ hiệu ứng đang nằm trong khung nhìn (IntersectionObserver), ~34 fps cho lưới,
  60 fps cho trình xem.
