import Button, { ButtonKind } from '@src/components/Button'
import TextField from '@src/components/TextField'
import { useLoginMutation } from '@src/generated/graphql'
import React from 'react'
// import s from './Login.module.sass'

const Login = () => {
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')

  const [loginMutation, { error }] = useLoginMutation()

  const login: React.FormEventHandler<HTMLFormElement> = React.useCallback(
    async (e) => {
      e.preventDefault()
      const res = await loginMutation({
        variables: {
          username,
          password,
        },
      })
      console.log(JSON.parse(JSON.stringify(res)))
    },
    [loginMutation, password, username],
  )

  return (
    <form onSubmit={login}>
      {error && <p>{error.message}</p>}
      <TextField
        autoComplete="username"
        label="Username"
        helperText="Hello!!!"
        value={username}
        onValue={setUsername}
      />
      <TextField
        type="password"
        autoComplete="current-password"
        label="Password"
        value={password}
        onValue={setPassword}
      />
      <Button kind={ButtonKind.PRIMARY} type="submit" large>
        Log in
      </Button>
    </form>
  )
}

export default Login
