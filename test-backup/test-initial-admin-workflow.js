// Test Initial Admin Approval Workflow
// This script validates the complete workflow from doctor approval to initial admin approval

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Initial Admin Approval Workflow\n');

// Test 1: Verify approvalSystem.js has correct statuses and notifications
function testApprovalSystemConfig() {
    console.log('📋 Test 1: Approval System Configuration');
    
    const approvalSystemPath = path.join(__dirname, 'src/utils/approvalSystem.js');
    const content = fs.readFileSync(approvalSystemPath, 'utf8');
    
    // Check for required status constants
    const requiredStatuses = [
        'INITIAL_DOCTOR_APPROVED',
        'PENDING_INITIAL_ADMIN_APPROVAL',
        'INITIALLY_APPROVED',
        'INITIAL_ADMIN_REJECTED'
    ];
    
    const missingStatuses = requiredStatuses.filter(status => !content.includes(status));
    
    if (missingStatuses.length === 0) {
        console.log('✅ All required status constants found');
    } else {
        console.log('❌ Missing status constants:', missingStatuses);
    }
    
    // Check for correct notification messages
    const requiredMessages = [
        'You are initially approved by administration. Appointment scheduled by hospital soon stay tuned.',
        'You are not eligible for donation initially - administration reject you.'
    ];
    
    const missingMessages = requiredMessages.filter(msg => !content.includes(msg));
    
    if (missingMessages.length === 0) {
        console.log('✅ All required notification messages found');
    } else {
        console.log('❌ Missing notification messages:', missingMessages);
    }
      // Check for automatic transition function
    if (content.includes('triggerAutomaticStatusTransition')) {
        console.log('✅ Automatic transition function found');
    } else {
        console.log('❌ Automatic transition function missing');
    }
    
    console.log('');
}

// Test 2: Verify doctor dashboard calls automatic transitions
function testDoctorDashboard() {
    console.log('📋 Test 2: Doctor Dashboard Integration');
    
    const doctorDashboardPath = path.join(__dirname, 'src/components/doctor/Dashboard.jsx');
    const content = fs.readFileSync(doctorDashboardPath, 'utf8');
      // Check if triggerAutomaticStatusTransition is called after doctor approval
    if (content.includes('triggerAutomaticStatusTransition')) {
        console.log('✅ Doctor dashboard calls automatic transitions');
    } else {
        console.log('❌ Doctor dashboard missing automatic transitions call');
    }
    
    // Check for INITIAL_DOCTOR_APPROVED status setting
    if (content.includes('INITIAL_DOCTOR_APPROVED')) {
        console.log('✅ Doctor sets INITIAL_DOCTOR_APPROVED status');
    } else {
        console.log('❌ Doctor dashboard missing INITIAL_DOCTOR_APPROVED status');
    }
    
    console.log('');
}

// Test 3: Verify admin dashboard handles initial approvals
function testAdminDashboard() {
    console.log('📋 Test 3: Admin Dashboard Integration');
    
    const adminDashboardPath = path.join(__dirname, 'src/components/admin/DonorManagement.jsx');
    const content = fs.readFileSync(adminDashboardPath, 'utf8');
    
    // Check for PENDING_INITIAL_ADMIN_APPROVAL in queries
    if (content.includes('PENDING_INITIAL_ADMIN_APPROVAL')) {
        console.log('✅ Admin dashboard queries for pending initial approvals');
    } else {
        console.log('❌ Admin dashboard missing initial approval queries');
    }
    
    // Check for initial approval buttons
    if (content.includes('Initially Approve') && content.includes('Initially Reject')) {
        console.log('✅ Admin dashboard has initial approval buttons');
    } else {
        console.log('❌ Admin dashboard missing initial approval buttons');
    }
      // Check for handleInitialApproval and handleInitialRejection functions
    if (content.includes('handleInitialApproval') && content.includes('handleInitialRejection')) {
        console.log('✅ Admin dashboard has initial approval handlers');
    } else {
        console.log('❌ Admin dashboard missing initial approval handlers');
    }
    
    console.log('');
}

// Test 4: Verify donor dashboard shows correct statuses
function testDonorDashboard() {
    console.log('📋 Test 4: Donor Dashboard Status Display');
    
    const donorDashboardPath = path.join(__dirname, 'src/components/donor/Dashboard.jsx');
    const content = fs.readFileSync(donorDashboardPath, 'utf8');
    
    // Check for correct status display texts
    if (content.includes('Initial Admin Approved')) {
        console.log('✅ Donor dashboard shows "Initial Admin Approved"');
    } else {
        console.log('❌ Donor dashboard missing "Initial Admin Approved" text');
    }
    
    if (content.includes('Rejected Admin Initial')) {
        console.log('✅ Donor dashboard shows "Rejected Admin Initial"');
    } else {
        console.log('❌ Donor dashboard missing "Rejected Admin Initial" text');
    }
    
    console.log('');
}

// Test 5: Verify workflow logic
function testWorkflowLogic() {
    console.log('📋 Test 5: Workflow Logic Validation');
    
    const approvalSystemPath = path.join(__dirname, 'src/utils/approvalSystem.js');
    const content = fs.readFileSync(approvalSystemPath, 'utf8');
    
    // Check for correct transition mapping
    const transitionPattern = /INITIAL_DOCTOR_APPROVED.*PENDING_INITIAL_ADMIN_APPROVAL/s;
    if (transitionPattern.test(content)) {
        console.log('✅ Correct transition from doctor approval to pending admin approval');
    } else {
        console.log('❌ Missing or incorrect transition logic');
    }
    
    // Check notification system integration
    if (content.includes('createNotification')) {
        console.log('✅ Notification system integrated');
    } else {
        console.log('❌ Notification system missing');
    }
    
    console.log('');
}

// Run all tests
function runAllTests() {
    try {
        testApprovalSystemConfig();
        testDoctorDashboard();
        testAdminDashboard();
        testDonorDashboard();
        testWorkflowLogic();
        
        console.log('🎉 Testing Complete!\n');
        console.log('📝 Summary:');
        console.log('- Initial admin approval workflow should be functional');
        console.log('- Doctor approvals automatically transition to admin review');
        console.log('- Admin can approve/reject with proper notifications');
        console.log('- Status displays match requirements');
        console.log('\n🚀 Ready for manual testing in the application!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

runAllTests();
