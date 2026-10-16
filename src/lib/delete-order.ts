export function deletionWarning(order: { productName: string; paid: boolean; shippingReimbursed: boolean }) {
  const flags = [order.paid ? "已匯款" : "", order.shippingReimbursed ? "運費已報銷" : ""].filter(Boolean);
  if (flags.length === 0) {
    return {
      strong: false,
      title: "刪除這張任務？",
      body: `「${order.productName}」會從列表、彙總和小幫手的畫面消失。截圖先留著，之後可以在「已刪除」還原。`,
    };
  }
  return {
    strong: true,
    title: "這張單已經有匯款紀錄",
    body: `「${order.productName}」已勾選${flags.join("和")}。刪除後不會出現在列表、彙總和小幫手的畫面，這筆錢也不再計入。截圖先留著，你可以從「已刪除」還原。`,
  };
}
