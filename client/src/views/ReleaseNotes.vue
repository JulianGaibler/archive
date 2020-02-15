<template>
    <div class="releasenotes">
        <header class="framed">
            <h1>{{ $t('views.releasenotes') }}</h1>
        </header>

        <div class="frame framed">
            <section v-for="item in changelog" :key="item.version">
                <header>
                    <span class="badge">{{item.version}}</span>
                    <h2>{{item.date}}</h2>
                </header>
                <ul>
                    <li v-for="change in item.changes" :key="change.message">
                        <div :class="['badge', change.label.toLowerCase()]">{{change.label}}</div>
                        <div class="message">
                            {{change.message}}
                            <template v-if="change.issue"> -
                                <a target="_blank" rel="noopener noreferrer" :href="`https://github.com/JulianWels/archive/issues/${change.issue}`">#{{change.issue}}</a>
                            </template>
                        </div>
                    </li>
                </ul>
            </section>
        </div>
    </div>
</template>

<script>
import changelog from '../../../changelog.toml'

export default {
    name: 'ReleaseNotes',
    data() {
        return {
            changelog,
        }
    },
}
</script>

<style scoped lang="stylus">
@import "~@/assets/styles/palette.styl"

.releasenotes
    .badge
        color rgba(255,255,255,0.85)
        border-radius 0.2rem

    section
        position relative
        padding 2.5rem 1rem
        max-width 35rem
        header
            display flex
            align-items center
            margin-bottom 1rem
            span
                c background archive-primary1
                width 4rem
                font-weight 600
                padding 0.35rem
                text-align center
                display inline-block
                margin-right .5rem
            h2
                font-size 1.25rem
                font-weight 300
                overflow hidden
                display block
                white-space nowrap
                text-overflow ellipsis
                flex 1
                width 0
        ul
            margin-left 4.75rem
            @media screen and (max-width: $archive-screen-small)
                margin-left 0
            li
                display flex
                align-items flex-start
                margin-bottom 0.5rem
                .badge
                    c background-color archive-grey3
                    display inline
                    flex 0 0 4rem
                    font-size .7rem
                    font-weight 600
                    margin-right .5rem
                    padding 0.25rem 0.4rem
                    text-transform uppercase
                    text-align center
                    &.added
                        background-color #1bb75a
                    &.fixed, &.improved
                        background-color #3281c3
                .message
                    line-height 1.4
                    a
                        c color archive-primary1
        header::before
            content ""
            background-image linear-gradient(to bottom, rgba(127,127,127,0.1), rgba(127,127,127,0.1))
            width 3px
            position absolute
            top 0
            bottom 0
            left calc((65px / 2) + 16px)
            z-index -1
        &:first-of-type header::before
            background-image linear-gradient(to bottom, rgba(127,127,127,0), rgba(127,127,127,0.1) 50px)
        &:last-of-type header::before
            background-image linear-gradient(to bottom, rgba(127,127,127,0.1), rgba(127,127,127,0))

</style>
