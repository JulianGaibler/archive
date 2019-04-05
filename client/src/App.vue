<template>
    <div>
        <Login />
    </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Login from './components/Login'


@Component({
    components: {
        Login
    }
})
export default class App extends Vue {

}
</script>