import { Card } from '../../components/ui/Card';

export function AIAssistantScaffold() {
  return (
    <Card title="Mô-đun AI" subtitle="Các hợp đồng đã phác thảo. Việc triển khai sẽ thực hiện sau khi hạ tầng ổn định.">
      <div className="ai-grid-scaffold">
        <div className="ai-box-scaffold">
          <strong>Gợi ý hội thoại</strong>
          <p>Giao diện và hợp đồng sự kiện sẽ gắn vào đây sau.</p>
        </div>
        <div className="ai-box-scaffold">
          <strong>Chuyên gia</strong>
          <p>RAG và tìm kiếm vẫn chờ cột mốc hạ tầng.</p>
        </div>
        <div className="ai-box-scaffold">
          <strong>Sửa lỗi</strong>
          <p>Tài nguyên tin nhắn và lời thoại đã sẵn sàng để nâng cấp.</p>
        </div>
      </div>
    </Card>
  );
}
