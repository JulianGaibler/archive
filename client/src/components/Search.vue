<template>
    <div class="actionBar-component actionBar-component-search">
        <IconSearch />

        <div v-for="label in showLabels.array" :key="label"
            class="filterChip hoverParent"
            @click="() => toggleFilters(label, true)"
            :class="{ active: openFilter[label] }"
            >
            {{ $t(filterProperties[label].tName) }}
            <component
                v-if="openFilter[label]"
                :is="filterProperties[label].component"
                @clear="() => clearFilter(label)"
                v-model="value[label]"
                v-click-outside="() => toggleFilters(label, false)"
            />
        </div>

        <input v-model="value.text" type="text" placeholder="Search..." />
        <div v-if="givenFilters.length > 1" class="hoverParent">
            <IconTune @click="toggleFilterMenu(true)" class="button-filter" />
            <div v-if="showFilterMenu" v-click-outside="() => toggleFilterMenu(false)" class="hoverBox">
                <div class="itemRow">
                    <h2 class="itemRow-grow">Add a Filter</h2>
                    <button @click="clearFilters" class="button button-chip">Reset</button>
                </div>
                <ul class="filterList">
                    <li v-if="value.text.length > 0" class="itemRow selected"><span class="itemRow-grow">Text</span><IconClose @click="() => clearFilter('text')" /></li>
                    <li v-for="label in givenFilters" :key="label" class="itemRow" :class="{selected: showLabels.bool[label]}">
                        <span class="itemRow-grow" @click="() => toggleFilters(label, true)">{{ $t(filterProperties[label].tName) }}</span>
                        <IconClose v-if="showLabels.bool[label]" @click="() => clearFilter(label)" />
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>


<script>

import IconSearch from '@/assets/jw_icons/search.svg?inline'
import IconTune from '@/assets/jw_icons/tune.svg?inline'
import IconClose from '@/assets/jw_icons/close.svg?inline'

import FilterUsers from './Search/FilterUsers'
import FilterTaskType from './Search/FilterTaskType'
import FilterLanguage from './Search/FilterLanguage'
import FilterKeywords from './Search/FilterKeywords'
import FilterPostType from './Search/FilterPostType'

export default {
    name: 'Search',
    props: {
        value: {
            type: Object,
            required: true,
        },
    },
    components: { IconSearch, IconTune, IconClose, FilterPostType, FilterTaskType, FilterLanguage, FilterKeywords, FilterUsers },
    data() {
        return {
            possibleFilters: ['postType', 'taskType', 'language', 'keywords', 'users'],
            filterProperties: {
                postType: {
                    component: FilterPostType,
                    tName: 'filters.type',
                },
                taskType: {
                    component: FilterTaskType,
                    tName: 'filters.type',
                },
                language: {
                    component: FilterLanguage,
                    tName: 'filters.language',
                },
                keywords: {
                    component: FilterKeywords,
                    tName: 'filters.keywords',
                },
                users: {
                    component: FilterUsers,
                    tName: 'filters.users',
                },
            },
            showFilterMenu: false,
            openFilter: {
                postType: false,
                taskType: false,
                language: false,
                keywords: false,
                users: false,
            },
        }
    },
    computed: {
        givenFilters() {
            let copy = { ...this.value }
            delete copy.text
            return Object.keys(copy)
        },
        showLabels() {
            let bool = {}
            let array = []
            this.possibleFilters.forEach(prop => {
                if (this.openFilter[prop] || (this.value[prop] !== undefined && this.value[prop].length > 0)) {
                    bool[prop] = true
                    array.push(prop)
                } else {
                    bool[prop] = false
                }
            })
            return {
                bool,
                array,
            }
        },
    },
    methods: {
        toggleFilterMenu(bool) {
            this.showFilterMenu = bool
        },
        toggleFilters(prop, bool) {
            this.openFilter[prop] = bool
        },
        clearFilter(prop) {
            this.openFilter[prop] = false
            let copy = { ...this.value }
            if (prop === 'language' || prop === 'text') copy[prop] = ''
            else copy[prop] = []
            this.$emit('input', copy)
        },
        clearFilters() {
            let copy = { ...this.value }
            this.possibleFilters.forEach(prop => {
                if (prop === 'language') copy[prop] = ''
                else copy[prop] = []
            })
            copy.text = ''
            this.$emit('input', copy)
        },
    },
}
</script>
