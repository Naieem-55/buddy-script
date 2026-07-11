import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  email: z.string().trim().toLowerCase().email("Invalid email").max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const createPostSchema = z.object({
  text: z.string().trim().max(5000).optional().default(""),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
});

export const createCommentSchema = z.object({
  text: z.string().trim().min(1, "Comment cannot be empty").max(2000),
  parentId: z.string().cuid().optional(),
});

export const cursorSchema = z.object({
  cursor: z.string().optional(), // "<isoDate>_<id>"
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
