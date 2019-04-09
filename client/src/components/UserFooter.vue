<template>
    <div class="footer">
        {{user.username}}
    </div>
</template>

<script>

export default {
    name: 'UserFooter',
    props: {
        user: Object
    },
}
</script>