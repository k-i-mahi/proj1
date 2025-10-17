const Notification = require('../models/Notification');

class NotificationHelper {
  // Issue created notification
  static async notifyIssueCreated(issue, reporter) {
    try {
      // You can add logic to notify nearby authorities
      // For now, just logging
      console.log(`Issue created: ${issue.title} by ${reporter.name}`);
    } catch (error) {
      console.error('Notify issue created error:', error);
    }
  }

  // Issue assigned notification
  static async notifyIssueAssigned(issue, assignedTo, assignedBy) {
    try {
      await Notification.createNotification({
        recipient: assignedTo._id,
        sender: assignedBy._id,
        issue: issue._id,
        type: 'issue_assigned',
        title: 'Issue Assigned to You',
        message: `${assignedBy.name} assigned you: ${issue.title}`,
        icon: '📌',
        link: `/issues/${issue._id}`,
      });
    } catch (error) {
      console.error('Notify issue assigned error:', error);
    }
  }

  // Status changed notification
  static async notifyStatusChanged(issue, oldStatus, newStatus, changedBy) {
    try {
      if (
        issue.reportedBy &&
        issue.reportedBy.toString() !== changedBy._id.toString()
      ) {
        await Notification.createNotification({
          recipient: issue.reportedBy,
          sender: changedBy._id,
          issue: issue._id,
          type: 'status_changed',
          title: 'Issue Status Updated',
          message: `Your issue "${issue.title}" status changed to ${newStatus}`,
          icon: newStatus === 'resolved' ? '✅' : '🔄',
          link: `/issues/${issue._id}`,
          metadata: { oldStatus, newStatus },
        });
      }

      // Notify followers
      if (issue.followers && issue.followers.length > 0) {
        const notifications = issue.followers
          .filter((id) => id.toString() !== changedBy._id.toString())
          .map((followerId) => ({
            recipient: followerId,
            sender: changedBy._id,
            issue: issue._id,
            type: 'follower_update',
            title: 'Followed Issue Updated',
            message: `Issue "${issue.title}" status: ${newStatus}`,
            icon: '⭐',
            link: `/issues/${issue._id}`,
          }));

        await Promise.all(
          notifications.map((n) => Notification.createNotification(n)),
        );
      }
    } catch (error) {
      console.error('Notify status changed error:', error);
    }
  }

  // Comment added notification
  static async notifyCommentAdded(issue, comment, commenter) {
    try {
      if (
        issue.reportedBy &&
        issue.reportedBy.toString() !== commenter._id.toString()
      ) {
        await Notification.createNotification({
          recipient: issue.reportedBy,
          sender: commenter._id,
          issue: issue._id,
          type: 'new_comment',
          title: 'New Comment on Your Issue',
          message: `${commenter.name} commented on "${issue.title}"`,
          icon: '💬',
          link: `/issues/${issue._id}#comments`,
          metadata: { commentText: comment.substring(0, 100) },
        });
      }
    } catch (error) {
      console.error('Notify comment added error:', error);
    }
  }

  // Upvote received notification
  static async notifyUpvoteReceived(issue, voter) {
    try {
      if (
        issue.reportedBy &&
        issue.reportedBy.toString() !== voter._id.toString()
      ) {
        await Notification.createNotification({
          recipient: issue.reportedBy,
          sender: voter._id,
          issue: issue._id,
          type: 'upvote_received',
          title: 'Your Issue Received Support',
          message: `${voter.name} upvoted your issue`,
          icon: '👍',
          link: `/issues/${issue._id}`,
        });
      }
    } catch (error) {
      console.error('Notify upvote received error:', error);
    }
  }

  // Issue resolved notification
  static async notifyIssueResolved(issue, resolvedBy) {
    try {
      if (
        issue.reportedBy &&
        issue.reportedBy.toString() !== resolvedBy._id.toString()
      ) {
        await Notification.createNotification({
          recipient: issue.reportedBy,
          sender: resolvedBy._id,
          issue: issue._id,
          type: 'issue_resolved',
          title: 'Your Issue Has Been Resolved',
          message: `Issue "${issue.title}" has been marked as resolved`,
          icon: '✅',
          link: `/issues/${issue._id}`,
        });
      }
    } catch (error) {
      console.error('Notify issue resolved error:', error);
    }
  }
}

module.exports = NotificationHelper;
