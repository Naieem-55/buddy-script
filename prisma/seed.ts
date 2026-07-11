import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

const ARGON = { memoryCost: 19456, timeCost: 2, parallelism: 1 };
const PASSWORD = "Password123";

async function main() {
  console.log("Seeding…");
  // Clean (order matters for FKs, but cascades handle most).
  await prisma.commentLike.deleteMany();
  await prisma.postLike.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hash(PASSWORD, ARGON);

  const people = [
    { firstName: "Karim", lastName: "Saif", email: "karim@buddy.dev" },
    { firstName: "Dylan", lastName: "Field", email: "dylan@buddy.dev" },
    { firstName: "Radovan", lastName: "Skill", email: "radovan@buddy.dev" },
    { firstName: "Ryan", lastName: "Roslansky", email: "ryan@buddy.dev" },
  ];

  const users = [];
  for (const p of people) {
    users.push(
      await prisma.user.create({ data: { ...p, passwordHash } })
    );
  }
  const [karim, dylan, radovan, ryan] = users;

  const base = new Date("2026-07-10T09:00:00.000Z").getTime();
  const at = (min: number) => new Date(base + min * 60_000);

  // Public posts (newest last so createdAt increases).
  const p1 = await prisma.post.create({
    data: {
      authorId: karim.id,
      text: "Healthy Tracking App — shipped the first milestone today! 🎉",
      imageUrl: null,
      visibility: "PUBLIC",
      createdAt: at(10),
    },
  });
  const p2 = await prisma.post.create({
    data: {
      authorId: dylan.id,
      text: "Design systems are a superpower for small teams.",
      visibility: "PUBLIC",
      createdAt: at(40),
    },
  });
  const p3 = await prisma.post.create({
    data: {
      authorId: radovan.id,
      text: "It is a long established fact that a reader will be distracted by readable content.",
      visibility: "PUBLIC",
      createdAt: at(80),
    },
  });
  // Karim's PRIVATE post — only Karim should see this in the feed.
  await prisma.post.create({
    data: {
      authorId: karim.id,
      text: "Private note to self: prep the investor deck.",
      visibility: "PRIVATE",
      createdAt: at(95),
    },
  });

  // Likes on p1 (drives the "who liked" list + counter).
  for (const u of [dylan, radovan, ryan]) {
    await prisma.postLike.create({ data: { userId: u.id, postId: p1.id } });
  }
  await prisma.post.update({
    where: { id: p1.id },
    data: { likeCount: 3 },
  });

  // Comments + replies + comment likes on p1.
  const c1 = await prisma.comment.create({
    data: {
      postId: p1.id,
      authorId: radovan.id,
      text: "This looks amazing, congrats!",
      createdAt: at(12),
    },
  });
  const r1 = await prisma.comment.create({
    data: {
      postId: p1.id,
      authorId: karim.id,
      parentId: c1.id,
      text: "Thank you Radovan 🙏",
      createdAt: at(13),
    },
  });
  const c2 = await prisma.comment.create({
    data: {
      postId: p1.id,
      authorId: dylan.id,
      text: "What stack did you use?",
      createdAt: at(20),
    },
  });
  await prisma.post.update({
    where: { id: p1.id },
    data: { commentCount: 3 },
  });

  // Likes on comment c1 and reply r1.
  await prisma.commentLike.create({ data: { userId: dylan.id, commentId: c1.id } });
  await prisma.commentLike.create({ data: { userId: ryan.id, commentId: c1.id } });
  await prisma.comment.update({ where: { id: c1.id }, data: { likeCount: 2 } });
  await prisma.commentLike.create({ data: { userId: radovan.id, commentId: r1.id } });
  await prisma.comment.update({ where: { id: r1.id }, data: { likeCount: 1 } });

  void p2;
  void p3;
  void c2;

  console.log(
    `Seeded ${users.length} users (password: "${PASSWORD}"), 4 posts, 3 comments.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
