<template>
	<div class="edit-cell" @click="startEdit">
		<el-tooltip
			v-if="!editing"
			:content="toolTipContent"
			:placement="toolTipPlacement"
			:show-after="toolTipDelay"
		>
			<div tabindex="0" class="cell-content" :class="{ 'edit-enabled-cell': canEdit }" @keyup.enter="startEdit">
				<slot />
			</div>
		</el-tooltip>
		<el-input v-else ref="input" v-model="draft" size="small" @blur="commit" @keyup.enter="commit" />
	</div>
</template>

<script>
export default {
	name: 'EditableCell',
	props: {
		modelValue: { type: String, default: '' },
		canEdit: { type: Boolean, default: false },
		toolTipContent: { type: String, default: 'Click to edit' },
		toolTipDelay: { type: Number, default: 500 },
		toolTipPlacement: { type: String, default: 'top-start' }
	},
	emits: ['update:modelValue', 'change'],
	data() {
		return {
			editing: false,
			draft: ''
		}
	},
	methods: {
		startEdit() {
			if (!this.canEdit || this.editing) return
			this.draft = this.modelValue
			this.editing = true
			this.$nextTick(() => this.$refs.input?.focus())
		},
		commit() {
			if (!this.editing) return
			this.editing = false
			const value = this.draft.trim()
			if (!value || value === this.modelValue) return
			this.$emit('update:modelValue', value)
			this.$emit('change', value)
		}
	}
}
</script>

<style>
.cell-content {
	min-height: 30px;
	padding-left: 5px;
	padding-top: 5px;
	border: 1px solid transparent;
}
.edit-enabled-cell {
	border: 1px dashed #409eff;
}
.edit-cell {
	min-height: 30px;
	cursor: pointer;
}
</style>
