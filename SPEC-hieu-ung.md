# Đặc tả viết hiệu ứng — Motion Lab

Website này mô phỏng lại 70 hiệu ứng chuyển động của thư viện animos.app bằng canvas 2D thuần.
Mỗi hiệu ứng là một `def` đăng ký vào `ML.defs`; không thư viện, không import, chạy được từ `file://`.

## 1. Đọc trước khi viết

- `motion-lab/js/lib.js` — engine + toàn bộ helper (đọc kỹ phần `ML.h` và `ML.renderOnce`).
- `motion-lab/js/effects/00-reference.js` — 6 hiệu ứng mẫu, viết đúng chuẩn này.
- `_animos/tpl/<id>.js` — mã gốc (đã rút gọn tên biến) của hiệu ứng tương ứng. Đọc để hiểu **cơ chế**
  (bán kính, nhịp, thứ tự vẽ, cách tính góc…), **không copy nguyên khối** — viết lại sạch, có tên biến rõ nghĩa.

## 2. Khuôn một hiệu ứng

```js
ML.register({
  id: 'cover-flow',                     // đúng id được giao, không tự đổi
  name: 'Cover Flow',                   // tên gốc tiếng Anh
  vn: 'Thẻ xoay 3D',                    // tên tiếng Việt ngắn (2–4 từ)
  group: 'flow',                        // 3d | flow | grid | reveal | spotlight | scene
  desc: 'Một câu tiếng Việt mô tả chuyển động.',
  duration: 12,                         // giây cho một vòng lặp, 6–20
  slots: [4, 16],                       // số ảnh tối thiểu / tối đa hiệu ứng cần
  params: [
    { id: 'cardSize', label: 'Cỡ thẻ', type: 'number', default: 46, min: 20, max: 90, step: 1, unit: '%' },
    { id: 'direction', label: 'Chiều', type: 'select', default: 'left',
      options: [{ value: 'left', label: 'Sang trái' }, { value: 'right', label: 'Sang phải' }] }
  ],
  render(c) {
    const { ctx, t, w, h, u, p, imgs, n } = c;
    // vẽ ở đây
  }
});
```

## 3. Hợp đồng bắt buộc

- Tệp là một IIFE `(function(){ 'use strict'; const H = ML.h; ... })();` — không `import`, không `export`.
- Chỉ vẽ lên `c.ctx`. Không tạo DOM, không `requestAnimationFrame`, không `setTimeout`, không `console.log`.
- `t` là tiến trình **0 → 1** rồi lặp. Trạng thái ở `t=0` và `t=1` phải trùng nhau để vòng lặp liền mạch
  (mẹo: dùng `t` trong các hàm lượng giác, hoặc `H.steps(t, n)` cho cảnh nhiều nhịp).
- Không dùng `Math.random` (dùng `H.hash(i, s)` để có ngẫu nhiên tất định, không nhấp nháy).
- Mọi kích thước tính theo `u` (= 1% cạnh ngắn), mọi tham số `%` nhân với `u`.
- Ảnh: `imgs[i % n]`, `n` có thể từ 4 đến 30 → phải đẹp với mọi `n`, không giả định `n === 12`.
- Hiệu năng: tối đa ~120 lệnh `drawImage` mỗi khung (canvas hiển thị khoảng 400×300).
- Đăng ký **đúng** các id được giao; không đăng ký thêm id khác.
- Tham số: 2–6 mục, nhãn tiếng Việt có dấu, mặc định cho ra trạng thái đẹp nhất. `type` chỉ `number` hoặc `select`.
- Mỗi hiệu ứng phải **khác nhau về cơ chế**, không được là bản sao đổi màu của hiệu ứng khác.

## 4. Helper có sẵn (đọc `lib.js` để biết chi tiết)

| Hàm | Việc |
|---|---|
| `H.card(ctx, img, x, y, w, h, radius, opts)` | vẽ ảnh phủ kín rect, bo góc. `opts`: `alpha`, `shadow`, `rot`, `blur`, `brightness`, `edge:false` |
| `H.at(cx, cy, w, h, scale)` | rect từ tâm + tỉ lệ |
| `H.perspCard(ctx, img, cx, cy, cw, ch, yaw, opts)` | thẻ quay quanh trục dọc có phối cảnh thật (vẽ theo cột) |
| `H.arcCard(ctx, img, cx, cy, ringR, angle, cw, ch, opts)` | thẻ uốn theo cung tròn (tường cong, quả cầu) |
| `H.grid(n, w, h, gapPx, cols?)` | mảng rect lưới đều |
| `H.fitBox(aspect, w, h)` | rect canh giữa theo tỉ lệ (`aspect` = w/h) |
| `H.q(t, a, b)` | đổi khoảng → 0..1, kẹp |
| `H.clamp01 / lerp / mix / smooth` | cơ bản |
| `H.easeOut / easeIn / easeInOut / easeOutQuint / easeExpo` | easing |
| `H.back(t, s)` | vượt biên rồi trở về (nảy) |
| `H.pulse(t, rise, fall)` | 0 → 1 → 0 có giữ nhịp |
| `H.steps(t, n)` | `{ i, local, all }` — cảnh chia n nhịp |
| `H.stagger(p, i, n, overlap)` | tiến trình so le của phần tử i |
| `H.hash(i, s)` | ngẫu nhiên tất định 0..1 |
| `H.aspect('16:9', w, h)` | đổi chuỗi tỉ lệ ra số |
| `H.pick(imgs, i)` | ảnh theo chỉ số vòng |

## 5. Kiểm tra trước khi báo xong

1. `node --check <đường-dẫn-tệp>` phải không lỗi.
2. Đọc lại: có id nào bị đăng ký hai lần không, có dùng biến chưa khai báo không, `params` có `default` nằm trong `min..max` không.
3. Với mỗi hiệu ứng, tự nhẩm ở `t = 0`, `0.35`, `0.7`: có nhìn thấy thẻ không, có khoảnh khắc trắng canvas không
   (ngoại trừ hiệu ứng wipe/reveal cố ý), thứ tự vẽ có làm thẻ trước đè thẻ sau sai không.

## 6. Báo cáo cuối

Trả về bảng: `id | tên | một câu cơ chế | số tham số`. Không dán lại toàn bộ mã.
