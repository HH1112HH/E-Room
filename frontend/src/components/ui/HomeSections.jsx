import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import {
  HiMicrophone, HiSparkles, HiGlobeAlt, HiArrowRight, HiChatBubbleLeftRight,
  HiAcademicCap, HiShieldCheck, HiVideoCamera, HiCheckCircle, HiClock,
  HiUsers, HiBolt, HiDocumentText, HiSpeakerWave, HiBriefcase,
  HiPresentationChartLine, HiCpuChip, HiQueueList, HiChartBar,
} from 'react-icons/hi2';
import { RobotAvatar } from './icons';

const PREVIEW_PARTICIPANTS = [
  { name: 'Bạn', label: 'Đang nói', active: true, color: '#ffffff' },
  { name: 'Mina', label: 'B2 · Sản phẩm', active: false, color: '#e0e0e0' },
  { name: 'Alex', label: 'C1 · AI/ML', active: false, color: '#f59e0b' },
  { name: 'Linh', label: 'B1 · Thiết kế', active: false, color: '#ec4899' },
];

const HERO_TRUST_ITEMS = [
  { icon: HiQueueList, label: 'Ghép cặp theo thẻ' },
  { icon: HiUsers, label: 'Phòng 3-5 người' },
  { icon: HiCpuChip, label: 'AI Agent 3-in-1' },
];

function ProductPreview() {
  return (
    <div className="home-preview" aria-label="Xem trước sản phẩm E-Room trên máy tính">
      <div className="home-preview__glow" />
      <div className="home-preview__browserbar">
        <div><i /><i /><i /></div>
        <span>eroom.app/rooms/vibe-coding</span>
        <strong>Pro Agent</strong>
      </div>
      <div className="home-preview__screen">
        <div className="home-preview__topbar">
          <div>
            <span className="home-preview__live">● ĐANG HOẠT ĐỘNG · VIBE CODING</span>
            <h3>Luyện tập Tư duy Sản phẩm cùng Claude</h3>
          </div>
          <div className="home-preview__meta">
            <span><HiClock size={13} /> 12:48</span>
            <span><HiUsers size={13} /> 4/5</span>
          </div>
        </div>

        <div className="home-preview__body">
          <div className="home-preview__stage">
            <div className="home-preview__video-grid">
              {PREVIEW_PARTICIPANTS.map((person) => (
                <div className={`home-preview__tile ${person.active ? 'is-speaking' : ''}`} key={person.name}>
                  <div className="home-preview__avatar" style={{ background: person.color }}>{person.name[0]}</div>
                  <div>
                    <strong>{person.name}</strong>
                    <span>{person.label}</span>
                  </div>
                  {person.active && <div className="home-preview__wave"><i /><i /><i /><i /></div>}
                </div>
              ))}
            </div>
            <div className="home-preview__timeline">
              <div><span>00:00</span><strong /><span>15:00</span></div>
              <p>Bản ghi chạy trực tiếp trong khi agent chuẩn bị phần sửa lỗi, gợi ý chuyên gia và ghi chú đánh giá.</p>
            </div>
            <div className="home-preview__controls">
              <span><HiMicrophone size={16} /></span>
              <span><HiVideoCamera size={16} /></span>
              <span><HiChatBubbleLeftRight size={16} /></span>
              <span className="is-hot"><HiBolt size={16} /></span>
            </div>
          </div>

          <aside className="home-preview__coach">
            <div className="home-preview__coach-head">
              <RobotAvatar />
              <div>
                <strong>AI Agent 3-in-1</strong>
                <span>Sửa lỗi · Chuyên gia · Gợi ý hội thoại</span>
              </div>
            </div>
            <div className="home-preview__transcript">
              <span>Bản ghi trực tiếp</span>
              <p>“Tôi dùng Claude để xây dựng prototype sản phẩm nhanh hơn.”</p>
            </div>
            <div className="home-preview__correction">
              <HiCheckCircle size={16} />
              <div>
                <span>Sửa lỗi</span>
                <strong>“Tôi dùng Claude để xây dựng prototype sản phẩm nhanh hơn.”</strong>
              </div>
            </div>
            <div className="home-preview__transcript">
              <span>Gợi ý hội thoại</span>
              <p>Claude đã giúp bạn cân nhắc đánh đổi gì?</p>
            </div>
            <div className="home-preview__score">
              <span>Đánh giá buổi học</span>
              <strong>8.6</strong>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export function HeroSection({ user, onQuickJoin, quickJoining }) {
  return (
    <section className="home-hero position-relative overflow-hidden">
      <div className="home-hero__backdrop" />
      <div className="home-hero__inner">
        <div className="home-hero__copy fade-in-up">
          <div className="home-hero__eyebrow">
            <RobotAvatar />
            <span>Phòng ghép theo thẻ · AI Agent 3-in-1</span>
          </div>
          <h1 className="home-hero__title">
            Nói chuyện với những người cùng chủ đề với bạn. Cải thiện với AI sau từng câu nói.
          </h1>
          <p className="home-hero__subtitle">
            E-Room ghép 3-5 người học theo thẻ và trình độ, mở phòng luyện nói tập trung, đồng thời cung cấp bản ghi trực tiếp, sửa lỗi, gợi ý chuyên gia, âm thanh phát âm và đánh giá buổi học.
          </p>
          <div className="home-hero__actions">
            {user ? (
              <Button variant="primary" size="lg" className="rounded-pill fw-semibold px-5"
                onClick={onQuickJoin} disabled={quickJoining}
              >
                {quickJoining ? 'Đang tìm phòng...' : 'Tham gia nhanh'}
              </Button>
            ) : (
              <Button variant="primary" size="lg" className="rounded-pill fw-semibold px-5" href="/login">
                Bắt đầu luyện tập miễn phí
              </Button>
            )}
            <Button variant="outline-secondary" size="lg" className="rounded-pill fw-semibold px-4" href="/learning">
              Xem phòng đang hoạt động <HiArrowRight size={16} />
            </Button>
          </div>
          <div className="home-hero__trust">
            {HERO_TRUST_ITEMS.map(item => (
              <span key={item.label}><item.icon size={15} />{item.label}</span>
            ))}
          </div>
        </div>
        <ProductPreview />
      </div>
    </section>
  );
}

export function ProblemSection() {
  const items = [
    ['Ghép cặp ngẫu nhiên', 'Hầu hết ứng dụng luyện nói ghép người không theo ngữ cảnh, nên cuộc trò chuyện nhanh chóng chết.'],
    ['Không có vòng phản hồi', 'Bạn nói 20 phút nhưng rời đi mà không biết cần sửa gì.'],
    ['Luyện tập AI đơn lẻ', 'Bot hữu ích, nhưng không tạo được áp lực và nhịp điệu của cuộc trò chuyện thật.'],
  ];

  return (
    <section className="home-problem-section">
      <div className="home-section-heading">
        <span>Vấn đề</span>
        <h2>Luyện nói thất bại khi phòng không có ngữ cảnh và phản hồi đến quá muộn.</h2>
      </div>
      <div className="home-problem-grid">
        {items.map(([title, desc], index) => (
          <article className="home-problem-card" key={title}>
            <strong>{String(index + 1).padStart(2, '0')}</strong>
            <h3>{title}</h3>
            <p>{desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PremiumFlowSection() {
  const steps = [
    { icon: HiQueueList, label: '01', title: 'Chọn thẻ', desc: 'Chọn sở thích như Vibe Coding, AI/ML, Prompt Engineering hoặc các chủ đề LLM.' },
    { icon: HiUsers, label: '02', title: 'Ghép vào phòng', desc: 'Phòng nhỏ 3-5 người được tạo dựa trên thẻ chung và trình độ tiếng Anh tương đương.' },
    { icon: HiMicrophone, label: '03', title: 'Nói chuyện trực tiếp', desc: 'LiveKit xử lý phòng trong khi bản ghi hiển thị ở bảng bên cạnh.' },
    { icon: HiSparkles, label: '04', title: 'Đánh giá với AI', desc: 'Sửa lỗi, Chuyên gia và Gợi ý hội thoại biến buổi học thành bài học có thể lặp lại.' },
  ];

  return (
    <section className="home-flow-section">
      <div className="home-section-heading home-section-heading--left">
        <span>Giải pháp</span>
        <h2>Biến mọi phòng có mục đích rõ ràng trước khi ai đó bật mic.</h2>
        <p>Thẻ xác định chủ đề, trình độ giữ phòng thoải mái, và AI agent biến cuộc trò chuyện trực tiếp thành tiến bộ có thể xem lại.</p>
      </div>
      <div className="home-flow-grid">
        {steps.map((step) => (
          <article className="home-flow-card" key={step.title}>
            <div><step.icon size={22} /><span>{step.label}</span></div>
            <h3>{step.title}</h3>
            <p>{step.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function AgentSection() {
  const roles = [
    { label: 'Sửa lỗi', metric: 'Ngữ pháp', desc: 'Biến những câu nói chưa chuẩn thành câu gọn gàng hơn mà không làm gián đoạn phòng.' },
    { label: 'Chuyên gia', metric: 'Ngữ cảnh', desc: 'Bổ sung giải thích theo chủ đề khi phòng cần thêm chiều sâu hoặc ví dụ.' },
    { label: 'Gợi ý hội thoại', metric: 'Động lực', desc: 'Giữ phòng im lặng tiếp tục hoạt động bằng các gợi ý theo chủ đề AI dựa trên thẻ và cuộc trò chuyện gần đây.' },
  ];

  return (
    <section className="home-agent-section">
      <div className="home-agent-panel">
        <div className="home-agent-copy">
          <span>Lớp hướng dẫn</span>
          <h2>Phản hồi xuất hiện bên cạnh cuộc trò chuyện, không chồng lên trên.</h2>
          <p>E-Room giữ phòng video tập trung vào con người. Trợ lý làm việc ở bảng bên cạnh: lắng nghe, sửa lỗi, trả lời và nhắc nhở chỉ khi cần thiết.</p>
        </div>
        <div className="home-agent-console">
          <div className="home-agent-console__top">
            <span>Thông minh buổi học</span>
            <strong>Trực tiếp</strong>
          </div>
          {roles.map(role => (
            <article key={role.label}>
              <div>
                <strong>{role.label}</strong>
                <span>{role.metric}</span>
              </div>
              <p>{role.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AudienceSection() {
  const audiences = [
    { icon: HiBriefcase, title: 'Phỏng vấn công nghệ', desc: 'Trình bày dự án AI, đánh đổi mô hình, kiến trúc hệ thống và quyết định kỹ thuật.' },
    { icon: HiPresentationChartLine, title: 'Họp công việc', desc: 'Luyện tập họp đứng, demo, gọi khách hàng và thảo luận sản phẩm.' },
    { icon: HiAcademicCap, title: 'Thảo luận AI', desc: 'Thảo luận LLM, prompt engineering và xu hướng AI với sửa lỗi theo thời gian thực.' },
    { icon: HiGlobeAlt, title: 'Giao tiếp hàng ngày', desc: 'Gặp gỡ người học quan tâm cùng chủ đề và nói thường xuyên hơn.' },
  ];

  return (
    <section className="home-audience-section">
      <div className="home-section-heading">
        <span>Trường hợp sử dụng</span>
        <h2>Luyện tập cho những tình huống tiếng Anh thực sự quan trọng.</h2>
      </div>
      <div className="home-audience-grid">
        {audiences.map((item) => (
          <article className="home-audience-card" key={item.title}>
            <div className="home-audience-card__icon"><item.icon size={22} /></div>
            <div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function RoomsSection({ rooms = [], roomsLoading, navigate }) {
  return (
    <section className="home-rooms-section">
      <div className="home-section-heading">
        <span>Phòng trực tiếp</span>
        <h2>Vào phòng đang hoạt động hoặc duyệt theo chủ đề.</h2>
      </div>
      {roomsLoading ? (
        <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>
      ) : rooms.length === 0 ? (
        <p className="text-muted text-center py-4 small">Hiện không có phòng nào. Hãy quay lại sau.</p>
      ) : (
        <div className="home-room-grid">
          {rooms.slice(0, 6).map((room) => (
            <button key={room.id} className="home-room-card" onClick={() => navigate(`/rooms/${room.id}`)}>
              <span>{room.status === 'ACTIVE' ? 'ĐANG HOẠT ĐỘNG' : 'Chờ'}</span>
              <h3>{room.topic || room.name}</h3>
              <p>{room.current_participants || 0}/{room.max_participants || 5} người tham gia</p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function StatsSection() {
  const stats = [
    { value: '3-5', label: 'người học mỗi phòng' },
    { value: '15m', label: 'buổi học tập trung' },
    { value: '3-in-1', label: 'vai trò AI agent' },
    { value: '50+', label: 'nhóm thẻ' },
  ];

  return (
    <section className="home-stats-section">
      {stats.map((s) => (
        <div key={s.label}>
          <strong>{s.value}</strong>
          <span>{s.label}</span>
        </div>
      ))}
    </section>
  );
}

export function FinalShowcaseSection({ user, navigate }) {
  const quotes = [
    { quote: 'Chủ đề phòng gần với công việc thật của tôi hơn một lớp luyện nói thông thường.', name: 'Minh Anh', role: 'Nhà thiết kế sản phẩm' },
    { quote: 'Tôi thấy đúng câu mình đã nói, phiên bản tốt hơn và điều cần lặp lại tiếp theo.', name: 'Hoang Tran', role: 'Kỹ sư backend' },
    { quote: 'Các gợi ý AI giữ cuộc trò chuyện tiếp tục khi mọi người im lặng.', name: 'Linh Pham', role: 'Người học IELTS' },
  ];

  return (
    <section className="home-final-section">
      <div className="home-final-header">
        <span><HiChartBar size={16} /> Người dùng nói gì</span>
        <h2>Luyện tập hữu ích mang tính cụ thể, không chung chung.</h2>
        <Button variant="primary" size="lg" className="rounded-pill fw-semibold px-5"
          onClick={() => navigate(user ? '/learning' : '/login')}
        >
          {user ? 'Tìm phòng' : 'Bắt đầu luyện tập'} <HiArrowRight size={16} />
        </Button>
      </div>
      <div className="home-testimonial-row">
        {quotes.map((item) => (
          <article key={item.name}>
            <p>“{item.quote}”</p>
            <strong>{item.name}</strong>
            <span>{item.role}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
