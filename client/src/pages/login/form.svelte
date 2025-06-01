<script lang="ts">
  import { preventDefault } from 'svelte/legacy'

  import TextField from 'tint/components/TextField.svelte'
  import Button from 'tint/components/Button.svelte'

  import { mutationStore, type OperationResultStore } from '@urql/svelte'
  import { webClient as client } from '@src/urql-client'

  import type {
    Exact,
    LoginMutation,
    LoginMutationVariables,
  } from '@src/generated/graphql'
  import LOGIN from '@src/queries/loginMutation.gql'

  let username = $state('')
  let password = $state('')

  let result:
    | OperationResultStore<LoginMutation, Exact<LoginMutationVariables>>
    | undefined = $state()

  const tryLogin = (args: LoginMutationVariables) => {
    result = mutationStore<LoginMutation, LoginMutationVariables>({
      client,
      query: LOGIN,
      variables: args,
    })
  }

  function onSubmit() {
    tryLogin({ username, password })
  }
</script>

<form onsubmit={preventDefault(onSubmit)}>
  <TextField id="a" label="Email" bind:value={username} />
  <TextField id="b" label="Password" bind:value={password} />
  <Button submit={true} variant="primary">Log in</Button>
</form>
<pre>{JSON.stringify($result, null, 2)}</pre>

<style lang="sass">

</style>
