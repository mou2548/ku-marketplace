import { listPosts } from "@/lib/api/posts";

export default async function PostsPage() {
  const posts = await listPosts({ cache: "no-store" });

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Posts</h1>
      <pre>{JSON.stringify(posts, null, 2)}</pre>
    </main>
  );
}
