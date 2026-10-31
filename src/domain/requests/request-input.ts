import { z } from "zod";
import { isValidPhone } from "./phone";
import { meetsMinimumTerm } from "../tenancies/calendar-months";
export const requestInput = z
  .object({
    contactName: z
      .string()
      .trim()
      .min(1, "Nhập tên liên hệ.")
      .max(120, "Tên liên hệ tối đa 120 ký tự."),
    contactPhone: z
      .string()
      .trim()
      .refine(isValidPhone, "Số điện thoại không hợp lệ."),
    desiredMoveInDate: z.iso.date("Nhập ngày theo định dạng dd/mm/yyyy."),
    desiredEndDate: z.iso.date("Nhập ngày theo định dạng dd/mm/yyyy."),
    preferredUnitId: z.guid("Căn ưu tiên không hợp lệ.").optional(),
    message: z
      .string()
      .trim()
      .min(1, "Nhập lời nhắn cho chủ nhà.")
      .max(5000, "Lời nhắn tối đa 5000 ký tự."),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      !z.iso.date().safeParse(value.desiredMoveInDate).success ||
      !z.iso.date().safeParse(value.desiredEndDate).success
    )
      return;
    const start = new Date(value.desiredMoveInDate),
      end = new Date(value.desiredEndDate);
    if (end <= start)
      ctx.addIssue({
        code: "custom",
        path: ["desiredEndDate"],
        message: "Ngày kết thúc phải sau ngày dọn vào.",
      });
    else if (!meetsMinimumTerm(start, end))
      ctx.addIssue({
        code: "custom",
        path: ["desiredEndDate"],
        message: "Thời hạn thuê tối thiểu là 3 tháng.",
      });
  });
