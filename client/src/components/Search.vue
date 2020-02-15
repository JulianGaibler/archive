<template>
    <div class="search">
        <IconSearch />

        <div
            v-for="label in showLabels.array"
            :key="label"
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

        <input
            v-model="value.text"
            v-focus="autofocus"
            type="text"
            placeholder="Search..." />

        <div v-if="givenFilters.length > 1" class="hoverParent">
            <button aria-label="Open Filter Options" @click="toggleFilterMenu(true)" class="button-filter"><IconTune /></button>
            <div
                v-if="showFilterMenu"
                v-click-outside="() => toggleFilterMenu(false)"
                class="hoverBox"
                v-hoverFix>
                <div class="itemRow hoverBox-header">
                    <h2 class="itemRow-grow">{{ $t('action.add_a_filter') }}</h2>
                    <button @click="clearFilters" class="button button-chip">{{ $t('action.reset') }}</button>
                </div>
                <ul class="optionList">
                    <li v-if="value.text.length > 0" class="option selected">
                        <button>{{ $t('filters.text') }}</button>
                        <button class="option-icon" @click="() => clearFilter('text')"><IconClose /></button>
                    </li>
                    <li
                        v-for="(label, i) in givenFilters"
                        :key="label"
                        class="option"
                        :class="{active: showLabels.bool[label]}">
                        <button @click="() => toggleFilters(label, true)" v-focus="i===0">{{ $t(filterProperties[label].tName) }}</button>
                        <button class="option-icon" v-if="showLabels.bool[label]" @click="() => clearFilter(label)"><IconClose /></button>
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
        autofocus: {
            type: Boolean,
            default: false,
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
            this.showFilterMenu = false
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
            this.givenFilters.forEach(prop => {
                if (prop === 'language') copy[prop] = ''
                else copy[prop] = []
            })
            copy.text = ''
            this.$emit('input', copy)
        },
    },
}
</script>
