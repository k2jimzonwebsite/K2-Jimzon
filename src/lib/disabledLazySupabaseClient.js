// Admin already owns the eager, singleton Supabase client used for staff Auth.
// This target-only alias prevents the Storefront's deferred import from creating
// a misleading static/dynamic split warning in the separate Admin artifact.
export const supabase = null
