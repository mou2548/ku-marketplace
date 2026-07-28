async function getPosts() {
  const res = await fetch('http://localhost:3001/posts', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to fetch posts');
  }
  return res.json();
}

export default async function PostsPage() {
  const data = await getPosts();

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Posts</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
