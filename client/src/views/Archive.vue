<template>
    <div>
        <header>
            <div class="col1">
                <h1>Archive</h1>
                <button class="button-big">Create New</button>
            </div>
            <div class="col2">
                <div class="left">
                    <button class="button-icon left"><IconSearch/></button>

                </div>
                <div class="right">
                    <button class="button-icon right"><IconEdit/></button>
                </div>
            </div>
        </header>
    </div>
</template>

<script>

import IconSearch from "@/assets/jw_icons/search.svg?inline";
import IconEdit from "@/assets/jw_icons/edit.svg?inline";

export default {
    name: 'Archive',
    components: {
        IconSearch, IconEdit
    },
}
</script>