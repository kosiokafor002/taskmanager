import mongoose from 'mongoose';

const categories = ['Work', 'Personal', 'Urgent'];

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters long']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [2, 'Description must be at least 2 characters long']
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
      validate: {
        validator(value) {
          return value >= startOfToday();
        },
        message: 'Due date cannot be in the past'
      }
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: categories,
        message: 'Category must be Work, Personal, or Urgent'
      }
    },
    completed: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

export { categories };
export default mongoose.model('Task', taskSchema);
