// Static copy for the landing page. Listings are demo data from the prototype
// until the listings module exists.

export const FEATURES = [
  {
    icon: "eye",
    title: "Thông tin minh bạch",
    text: "Giá, tiền cọc và nội quy hiển thị rõ cho từng căn.",
  },
  {
    icon: "phone",
    title: "Liên hệ trực tiếp",
    text: "Chủ nhà liên lạc trực tiếp với bạn, không qua môi giới.",
  },
  {
    icon: "contract",
    title: "Hợp đồng có phiên bản",
    text: "Bạn xem và xác nhận đúng phiên bản đã lưu trữ.",
  },
  {
    icon: "calendar",
    title: "Thuê dài hạn",
    text: "Tối thiểu 3 tháng, tình trạng trống theo ngày.",
  },
] as const;

export type Listing = {
  image: string;
  type: string;
  availability: string;
  title: string;
  location: string;
  bedrooms: string;
  bathrooms: string;
  area: string;
  price: string;
};

export const LISTINGS: Listing[] = [
  {
    image: "/images/listings/studio-my-khe.jpg",
    type: "Studio",
    availability: "3 căn còn trống",
    title: "Studio full nội thất gần biển Mỹ Khê",
    location: "Phước Mỹ, Sơn Trà, Đà Nẵng",
    bedrooms: "Studio",
    bathrooms: "WC riêng",
    area: "24–30 m²",
    price: "từ 3,8 triệu",
  },
  {
    image: "/images/listings/apartment-song-han.jpg",
    type: "Căn hộ",
    availability: "1 căn còn trống",
    title: "Căn hộ A, ban công hướng sông Hàn",
    location: "Thạch Thang, Hải Châu, Đà Nẵng",
    bedrooms: "2 PN",
    bathrooms: "2 WC",
    area: "68 m²",
    price: "5,8 triệu",
  },
  {
    image: "/images/listings/apartment-my-an.jpg",
    type: "Căn hộ",
    availability: "2 căn còn trống",
    title: "Căn hộ 2 phòng ngủ gần biển Mỹ An",
    location: "Mỹ An, Ngũ Hành Sơn, Đà Nẵng",
    bedrooms: "2 PN",
    bathrooms: "2 WC",
    area: "75 m²",
    price: "từ 6,0 triệu",
  },
];

export const AREAS = [
  {
    image: "/images/areas/hai-chau.jpg",
    name: "Hải Châu",
    note: "Trung tâm, gần sông Hàn và chợ Hàn",
  },
  {
    image: "/images/areas/son-tra.jpg",
    name: "Sơn Trà",
    note: "Gần biển Mỹ Khê, nhịp sống thư thả",
  },
  {
    image: "/images/areas/ngu-hanh-son.jpg",
    name: "Ngũ Hành Sơn",
    note: "Yên tĩnh, gần biển Mỹ An và các trường đại học",
  },
];

export const STEPS = [
  {
    title: "Tìm và lọc theo ngày",
    text: "Lọc theo khu vực, giá, tiện ích. Tình trạng trống chỉ mang tính chỉ báo.",
  },
  {
    title: "Gửi yêu cầu thuê",
    text: "Gửi yêu cầu không giữ chỗ. Chủ nhà sẽ liên lạc cho bạn để trao đổi và hẹn xem nhà.",
  },
  {
    title: "Xác nhận hợp đồng",
    text: "Chủ nhà gửi phiên bản hợp đồng, bạn xem và xác nhận trước hạn chót.",
  },
];

export const FAQ = [
  {
    q: "Thời hạn thuê tối thiểu là bao lâu?",
    a: "Tối thiểu 3 tháng. Mỗi căn có thể đặt thời hạn tối thiểu dài hơn, hiển thị rõ trên tin đăng.",
  },
  {
    q: "Gửi yêu cầu có giữ chỗ cho tôi không?",
    a: "Không. Căn chỉ được giữ khi chủ nhà gửi đề xuất hợp đồng, và giữ trong 48 giờ để bạn phản hồi.",
  },
  {
    q: "Tôi có thanh toán qua rentOS không?",
    a: "Không. Xem nhà, đặt cọc và thanh toán diễn ra trực tiếp giữa bạn và chủ nhà, ngoài ứng dụng.",
  },
  {
    q: "“Xác nhận” hợp đồng có phải chữ ký điện tử không?",
    a: "Không. Xác nhận là ghi nhận bạn đồng ý với phiên bản hợp đồng đã lưu trữ trên rentOS.",
  },
  {
    q: "Tôi có thể nuôi thú cưng không?",
    a: "Tùy từng căn. Chính sách thú cưng và hút thuốc được ghi trong phần Nội quy của tin đăng và trong hợp đồng.",
  },
];
