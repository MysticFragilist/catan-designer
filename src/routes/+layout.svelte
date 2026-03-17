<script>
  import '../app.css';
  import { inject } from '@vercel/analytics';

  inject();

  let { children } = $props();
</script>

{@render children()}
