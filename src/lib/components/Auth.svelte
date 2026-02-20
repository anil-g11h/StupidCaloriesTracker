<script lang="ts">
  import { supabase } from '$lib/supabaseClient';

  let loading = $state(false);
  let email = $state('');
  let password = $state('');
  let isSignUp = $state(false);

  async function handleAuth() {
    try {
      loading = true;
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password
        });
        if (error) throw error;
        alert('Check your email for the login link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
      }
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
    } finally {
      loading = false;
    }
  }
</script>

<div class="row flex-center flex">
  <div class="col-6 form-widget" aria-live="polite">
    <p class="description">{isSignUp ? 'Sign up' : 'Sign in'} with your email and password</p>
    <form class="form-widget space-y-4" onsubmit={(e) => { e.preventDefault(); handleAuth(); }}>
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
        <input
          id="email"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          type="email"
          placeholder="Your email"
          bind:value={email}
        />
      </div>
      <div>
        <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
        <input
            id="password"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            type="password"
            placeholder="Your password"
            bind:value={password}
        />
      </div>
      <div>
        <button type="submit" class="button block w-full primary bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50" disabled={loading}>
          {loading ? 'Loading' : isSignUp ? 'Sign Up' : 'Sign In'}
        </button>
      </div>
    </form>
    <div class="mt-4 text-center">
        <button class="text-sm text-blue-600 hover:underline" onclick={() => isSignUp = !isSignUp}>
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
    </div>
  </div>
</div>
