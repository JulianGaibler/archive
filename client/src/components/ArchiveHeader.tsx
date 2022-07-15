import React from 'react'
import './ArchiveHeader.sass'
import Button, { ButtonKind } from '@src/components/Button'
import { useMeQuery } from '@src/generated/graphql'
import { ButtonMenu, useContextMenu } from './ButtonMenu'

import IconUser from '@src/assets/icons/user.svg'
import IconQueue from '@src/assets/icons/queue.svg'
import IconNew from '@src/assets/icons/new.svg'
import IconSettings from '@src/assets/icons/settings.svg'
import IconLogout from '@src/assets/icons/logout.svg'

const navigation = [
  {
    label: 'My profile',
    icon: <IconUser />,
  },
  {
    label: 'Queue',
    icon: <IconQueue />,
  },
  null,
  {
    label: 'Release Notes',
    icon: <IconNew />,
  },
  null,
  {
    label: 'Settings',
    icon: <IconSettings />,
  },
  {
    label: 'Logout',
    icon: <IconLogout />,
  },
]

const ArchiveHeader = () => {
  const { error, data } = useMeQuery()

  const ctx = useContextMenu()

  return (
    <header>
      <h1>Archive</h1>
      {error && <Button to="/login">Log in</Button>}
      {data && (
        <>
          <button
            ref={(ref) => (ctx.anchorRef.current = ref)}
            onClick={ctx.trigger}
            style={{
              borderRadius: '35%',
              width: '32px',
              height: '32px',
              background: `url(${data?.me?.profilePicture}-32.jpeg)`,
            }}
          ></button>
          <ButtonMenu ctx={ctx} className="archive--header--menu">
            {navigation.map((item, i) =>
              item ? (
                <Button
                  key={item.label}
                  kind={ButtonKind.SECONDARY_TINTBAR}
                  large={true}
                  icon={item.icon}
                >
                  {item.label}
                </Button>
              ) : (
                <hr key={i} />
              ),
            )}
          </ButtonMenu>
        </>
      )}
    </header>
  )
}

export default ArchiveHeader
