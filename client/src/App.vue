<template>
    <div id="app">
        <main>
            <keep-alive :include="['Archive', 'User', 'Collection']">
                <router-view />
            </keep-alive>
        </main>
        <SideBar v-if="$router.currentRoute.name !== 'Login'" />
        <Prompt
            v-if="currentPrompt"
            :important="currentPrompt.important"
            :messageA="currentPrompt.messageAT ? $t(currentPrompt.messageAT) : currentPrompt.messageA"
            :messageB="currentPrompt.messageBT ? $t(currentPrompt.messageBT) : currentPrompt.messageB"
            :actionA="currentPrompt.actionAT ? $t(currentPrompt.actionAT) : currentPrompt.actionA"
            :actionB="currentPrompt.actionBT ? $t(currentPrompt.actionBT) : currentPrompt.actionB"
            @cancel="popPrompt"
            @confirm="currentPrompt.confirm" />
    </div>
</template>

<script>
import EventBus from '@/EventBus'
import Prompt from '@/components/Prompt'
import SideBar from '@/components/SideBar'

export default {
    name: 'app',
    components: {
        Prompt,
        SideBar,
    },
    data() {
        return {
            promptQueue: [],
        }
    },
    methods: {
        /**
         * [pushPrompt description]
         * @param  {String}     options.messageA[T]  Headline message (Add T when i18n-key)
         * @param  {String}    [options.messageB[T]] Optional paragraph (Add T when i18n-key)
         * @param  {String}     options.actionA[T]   Cancel Message (Add T when i18n-key)
         * @param  {String}    [options.actionB[T]]  Optional confirm message (Add T when i18n-key)
         * @param  {bool}      [options.important]   Optional bool to mark this prompt as important or dangerous
         * @param  {Function}  [options.confirm]     Callback function when confirm button is clicked
         */
        pushPrompt(options) {
            const callback = options.confirm
            options.confirm = () => {
                this.popPrompt()
                callback()
            }
            this.promptQueue.push(options)
        },
        /**
         * Pops current prompt from queue
         */
        popPrompt() {
            if (this.promptQueue.length > 0)
                this.promptQueue.pop()
        },
    },
    computed: {
        currentPrompt() {
            const len = this.promptQueue.length
            if (len > 0) return this.promptQueue[len-1]
            else return false
        },
    },
    created() {
        // Prompt event-listener
        EventBus.$on('pushPrompt', this.pushPrompt)
        // Taking control of global error handler
        this.$apolloProvider.errorHandler = error => {
            if (this.$router.currentRoute.name !== 'Login') {
                for (let i = 0; i < error.graphQLErrors.length; i++) {
                    if (error.graphQLErrors[i].code === 'AuthenticationError') {
                        this.$router.replace('/login')
                        break
                    }
                }
            }
        }
    },
}
</script>
