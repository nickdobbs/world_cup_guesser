import type { Database } from './database.types';

// Convenience aliases so consumers don't have to navigate the nested type.
//
// Usage:
//   import type { Note, NoteInsert, Profile } from '@/lib/database.helpers';
//
//   function NoteCard({ note }: { note: Note }) { ... }

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Specific table type exports — add to these as schema grows.
export type Profile = Tables<'profiles'>;
export type ProfileInsert = TablesInsert<'profiles'>;
export type ProfileUpdate = TablesUpdate<'profiles'>;

export type Note = Tables<'notes'>;
export type NoteInsert = TablesInsert<'notes'>;
export type NoteUpdate = TablesUpdate<'notes'>;