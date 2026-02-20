<script lang="ts">
  import { Home, PlusCircle, User, Clock, Dumbbell } from 'lucide-svelte';
  import { page } from '$app/stores';

  let currentPath = $state('');

  $effect(() => {
    currentPath = $page.url.pathname;
  });

  const links = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/log', label: 'Log', icon: PlusCircle },
    { href: '/time', label: 'Time', icon: Clock },
    { href: '/workouts', label: 'Gym', icon: Dumbbell },
    { href: '/profile', label: 'Me', icon: User },
  ];
</script>

<nav class="fixed bottom-0 left-0 right-0 border-t bg-card pb-safe pt-2 border-border-subtle">
  <div class="flex justify-around items-center h-14">
    {#each links as link}
      {@const Icon = link.icon}
      <a 
        href={link.href} 
        class="flex flex-col items-center justify-center w-full h-full space-y-1 text-xs font-medium transition-colors"
        class:text-brand={currentPath === link.href}
        class:text-text-muted={currentPath !== link.href}
      >
        <Icon size={20} strokeWidth={2.5} />
        <span>{link.label}</span>
      </a>
    {/each}
  </div>
</nav>
