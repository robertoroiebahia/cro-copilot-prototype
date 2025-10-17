import { createClient } from '@/utils/supabase/server';

type Todo = Record<string, unknown>;

export default async function TodosPage() {
  const supabase = createClient();

  const { data: todos, error } = await supabase.from('todos').select('*').limit(50);

  if (error) {
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-10">
        <h1 className="text-2xl font-semibold text-red-600">Supabase Error</h1>
        <pre className="rounded bg-red-50 p-4 text-sm text-red-800">{error.message}</pre>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Supabase Todos</h1>
      <p className="text-sm text-slate-600">
        Rendering rows from the <code>todos</code> table using the server-side Supabase client.
      </p>
      <ul className="grid gap-2 rounded border border-slate-200 bg-white p-4 shadow-sm">
        {todos && todos.length > 0 ? (
          todos.map((todo, index) => (
            <li key={String(todo['id'] ?? index)} className="text-sm text-slate-800">
              {typeof todo === 'object' ? JSON.stringify(todo) : String(todo)}
            </li>
          ))
        ) : (
          <li className="text-sm text-slate-500">No todos found.</li>
        )}
      </ul>
    </main>
  );
}
