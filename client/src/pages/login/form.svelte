<script lang="ts">
  import TextField from 'tint/components/TextField.svelte'
  import Button from 'tint/components/Button.svelte'

  import { mutationStore, type OperationResultStore } from '@urql/svelte'
  import { webClient as client } from '@src/urql-client'

  import type { Exact, LoginMutation, LoginMutationVariables } from '@src/generated/graphql'
import LOGIN from '@src/queries/loginMutation.gql'

let username = ''
let password = ''

let result: OperationResultStore<LoginMutation, Exact<LoginMutationVariables>> | undefined

const tryLogin = (args: LoginMutationVariables) => {
  result = mutationStore<LoginMutation, LoginMutationVariables>({
    client,
    query: LOGIN,
    variables: args,
  })
}

function onSubmit() {
  console.log('submit')
  tryLogin({ username, password })
}

</script>


<form on:submit|preventDefault={onSubmit}>
  <TextField id="a" label="Email" bind:value={username} />
  <TextField id="b" label="Password" bind:value={password} />
  <Button submit={true} variant="primary">Log in</Button>
</form>
<pre>{JSON.stringify($result, null, 2)}</pre>

<style lang="sass">

</style>
